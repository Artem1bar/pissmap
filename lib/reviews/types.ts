// Shared review shapes with zero runtime dependencies, so client components can
// import them without pulling in Drizzle or the database layer.

export interface PublicReview {
  id: string;
  spotId: string;
  rating: number;
  body: string;
  nickname: string | null;
  createdAt: string;
}
