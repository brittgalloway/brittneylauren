/**
 * Signup form Alpine component.
 *
 * On successful submission, envelope enters mailbox
 * Respects prefers-reduced-motion.
 *
 * Submission POSTs to /api/subscribe (see /api/subscribe.js).
 */

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

function playMailAnimation() {
  const envelope = document.getElementById('envelope');

  const prefersReduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReduced) {
    gsap.to(envelope, {
      opacity: 0,
      duration: 0.3,
      onComplete: showSuccess,
    });
    return;
  }

  gsap.set(envelope, {
    rotateX: 0,
    y: 0,
    z: 0,
    transformPerspective: 1100,
    transformOrigin: 'center bottom',
  });

  const tl = gsap.timeline({ onComplete: showSuccess });

  tl
    // Step 1 — tilt back and rise simultaneously
    .to(envelope, {
      transformPerspective: 1100,
      rotateX: 60,
      y: '-55vh',
      z: -10,
      duration: 0.6,
      ease: 'power1.in',
    })

    // Step 2 — re-measure after step 1, center over slot and push back in z
    .call(() => {
      const slotRect = document.getElementById('mailbox-slot').getBoundingClientRect();
      const envRect  = envelope.getBoundingClientRect();

      tl.to(envelope, {
        transformPerspective: 1000,
        rotateX: 100,
        x: (slotRect.left + slotRect.width  / 2) - (envRect.left + envRect.width  / 2),
        y: `+=${(slotRect.top + slotRect.height / 2) - (envRect.top + envRect.height / 2)}`,
        z: `-=500`,
        duration: 0.7,
        ease:'none',
      })
      .to(envelope, {
        rotateX: 60,
        y: `+=${(slotRect.top + slotRect.height / 2)}`,
        z: `-=30`,
        scale: 0.9,
        duration: 0.5,
        ease: 'none',
      })

      // Step 3 — clip the envelope so it appears to slide into the slot.
      .call(() => {
        const wrapper   = document.getElementById('envelope-wrapper');
        const slotRect2 = document.getElementById('mailbox-slot').getBoundingClientRect();
        const wrapRect  = wrapper.getBoundingClientRect();

        // Clip the wrapper (which never moves) from the top down to the slot
        // making it look like it slides into the mailbox.
        const clipTop = Math.min(100, Math.max(0,
          ((slotRect2.top - wrapRect.top) / wrapRect.height) * 100
        ));
        wrapper.style.clipPath = `inset(${clipTop}% 0 0 0)`;

        const envRect2 = envelope.getBoundingClientRect();

        tl.to(envelope, {
          transformPerspective: 1000,
          rotateX: 0,
          x: `+=${(slotRect2.left + slotRect2.width  / 2) - (envRect2.left + envRect2.width  / 2)}`,
          y: `-=${(envRect2.top  + envRect2.height) * 2}`,
          z: `-=2000`,
          scale: 0.6,
          duration: 1.5,
          ease: 'power1.out',
        }).to(envelope, {
          opacity:0,
          duration: 0,
        });
      });
    });
}

/** Reveals the success message after the envelope animation completes. */
function showSuccess() {
  const envelope = document.getElementById('envelope');
  const wrapper  = document.getElementById('envelope-wrapper');
  const success  = document.getElementById('success-message');

  wrapper.style.clipPath = '';
  envelope.setAttribute('hidden', '');

  success.removeAttribute('hidden');

  gsap.fromTo(
    success,
    { opacity: 0, y: -200 },
    { opacity: 1, y: -260, duration: 1, ease: 'power2.out' }
  );
}

// ---------------------------------------------------------------------------
// Alpine component
// ---------------------------------------------------------------------------

function signupForm() {
  return {
    fields: {
      name: '',
      email: '',
    },
    errors: {
      name: '',
      email: '',
    },
    status: 'idle', // idle | submitting | error
    serverError: '',

    validateField(field) {
      if (field === 'email') {
        const value = this.fields.email.trim();
        if (!value) {
          this.errors.email = 'Please enter your email address.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          this.errors.email = 'Enter a valid email address.';
        } else {
          this.errors.email = '';
        }
      }

      if (field === 'name') {
        const value = this.fields.name.trim();
        if (!value) {
          this.errors.name = 'Please enter your name.';
        } else {
          this.errors.name = '';
        }
      }
    },

    validateAll() {
      this.validateField('name');
      this.validateField('email');
      return !this.errors.name && !this.errors.email;
    },

    async submitForm() {
      this.serverError = '';

      if (!this.validateAll()) {
        const firstInvalid = this.errors.name ? 'name' : 'email';
        document.getElementById(firstInvalid)?.focus();
        return;
      }

      this.status = 'submitting';

      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:  this.fields.name.trim(),
            email: this.fields.email.trim(),
          }),
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          this.status = 'error';
          this.serverError = body.error || 'Something went wrong. Please try again.';
          return;
        }

        playMailAnimation();

      } catch (err) {
        this.status = 'error';
        this.serverError = 'Could not reach the server. Check your connection and try again.';
      }
    },
  };
}