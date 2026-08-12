export interface UserPointsState {
  currentPoints: number;
  addPoints: (points: number) => void;
  deductPoints: (points: number) => void; // ✅ Add this
  setPoints: (points: number) => void;
}