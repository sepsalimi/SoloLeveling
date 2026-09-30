// Bounds which check-in transcripts are kept in device drafts and database rows.
const transcriptStorageLimit = 50_000;

export function retainedTranscript(transcript: string) {
  return new TextEncoder().encode(transcript).length <= transcriptStorageLimit ? transcript : null;
}

export function appendTranscript(
  transcripts: string[],
  notices: string[],
  transcript: string
) {
  const stored = retainedTranscript(transcript);
  if (stored) {
    return {
      transcripts: [...transcripts, transcript],
      transcriptRetentionNotices: notices
    };
  }
  return {
    transcripts,
    transcriptRetentionNotices: [
      ...notices,
      "This transcript was processed but not retained because it exceeded 50 KB."
    ]
  };
}
