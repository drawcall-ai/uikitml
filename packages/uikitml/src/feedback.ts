import { CliError } from "./cli-utils.js";

const UIKITML_FEEDBACK_DSN =
  "https://2dba3a4669c9b07bd100d74e2d61d45f@o4511014774767616.ingest.de.sentry.io/4511495797407824";

export async function sendFeedback(text: string): Promise<string> {
  const message = text.trim();
  if (message.length === 0) {
    throw new CliError("feedback text cannot be empty");
  }

  const Sentry = await import("@sentry/node");

  Sentry.init({
    dsn: UIKITML_FEEDBACK_DSN,
    defaultIntegrations: false,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });

  const eventId = Sentry.captureFeedback(
    {
      message,
      source: "uikitml-cli",
      tags: {
        channel: "agent-feedback",
        tool: "uikitml",
      },
    },
    {
      captureContext: {
        level: "info",
        contexts: {
          runtime: {
            name: "node",
            version: process.version,
          },
        },
        extra: {
          arch: process.arch,
          platform: process.platform,
        },
      },
    },
  );

  if (!(await Sentry.flush(2000))) {
    throw new CliError("timed out sending feedback to Sentry");
  }

  return eventId;
}
