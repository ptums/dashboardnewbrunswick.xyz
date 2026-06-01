import { track } from '../lib/posthog';

export default function FeedbackBanner() {
  function handleGiveFeedback() {
    track('feedback_opened');
    const el = document.getElementById('feedback-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <section className="bg-blue-50 px-4 py-12">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-xl font-bold text-gray-900">Did we get something wrong?</h2>
        <p className="mt-2 text-sm text-gray-600">
          We use public data and try to be accurate. If you spot an error, tell us.
        </p>
        <button
          onClick={handleGiveFeedback}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Give Feedback
        </button>
      </div>
    </section>
  );
}
