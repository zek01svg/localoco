import { useState, useEffect, useCallback } from "react";
import { useAuthStore, UserBusiness } from "../store/authStore";

export const useUserBusinesses = () => {
    const [businesses, setBusinesses] = useState<UserBusiness[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const userId = useAuthStore((state) => state.userId);

    const fetchUserBusinesses = useCallback(async () => {
        if (!userId) {
            setBusinesses([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/businesses/owned`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ownerId: userId }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch businesses");
            }

            const data = await response.json();
            setBusinesses(data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch businesses");
            setBusinesses([]);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchUserBusinesses();
    }, [fetchUserBusinesses]);

    return {
        businesses,
        isLoading,
        error,
        refetch: fetchUserBusinesses,
    };
};
