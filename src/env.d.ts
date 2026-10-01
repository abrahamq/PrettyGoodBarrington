// Types for the VITE_ settings the game reads at build time (see README "Leaderboard server").
interface ImportMetaEnv {
    readonly VITE_LEADERBOARD_URL?: string;
}
