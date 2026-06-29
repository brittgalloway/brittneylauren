/**
 *
 * POSTs to our own /api/subscribe serverless
 * function (see /api/subscribe.js), which forwards the signup to
 * MailerLite. 
 */
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
    status: 'idle', 
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
            name: this.fields.name.trim(),
            email: this.fields.email.trim(),
          }),
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          this.status = 'error';
          this.serverError = body.error || 'Something went wrong. Please try again.';
          return;
        }

        this.status = 'success';
        this.fields.name = '';
        this.fields.email = '';
      } catch (err) {
        // Network failure (offline, MailerLite/Vercel unreachable)
        this.status = 'error';
        this.serverError = 'Could not reach the server. Check your connection and try again.';
      }
    },
  };
}