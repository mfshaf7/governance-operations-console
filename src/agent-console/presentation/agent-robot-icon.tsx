export function AgentRobotIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8V4H8"
        stroke="#1c1106"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <rect
        fill="#f7f0e4"
        height="12"
        rx="2.6"
        stroke="#1c1106"
        strokeLinejoin="round"
        strokeWidth="1.7"
        width="16"
        x="4"
        y="8"
      />
      <path
        d="M2 14h2M20 14h2"
        stroke="#1c1106"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M9 13v2M15 13v2"
        stroke="#ff3b30"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}
