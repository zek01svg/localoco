import { useState, useEffect } from "react";
import { Business } from "../types/business";

export const useBusinessByUen = (uen: string | null) => {
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!uen) {
            setBusiness(null);
            return;
        }

        const fetchBusiness = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/business?uen=${uen}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch business");
                }

                const data = await response.json();
                setBusiness(data);
            } catch (err: any) {
                setError(err.message || "Failed to fetch business");
                setBusiness(null);
            } finally {
                setLoading(false);
            }
        };

        fetchBusiness();
    }, [uen]);

    return { business, loading, error };
};
