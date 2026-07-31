export type ConsoleOperatorAttribution = Readonly<{
  actorId: string;
  sessionId: string;
}>;

export const prototypeLocalOperatorAttribution = {
  actorId: "operator:local-preview",
  sessionId: "prototype-local-session",
} as const satisfies ConsoleOperatorAttribution;
