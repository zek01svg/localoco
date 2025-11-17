export interface UserPointsState {
    currentPoints: number;
    addPoints: (points: number) => void;
    deductPoints: (points: number) => void; 
    setPoints: (points: number) => void;
}
