import { useEffect, useMemo } from "react";
import { useBusinessStore } from "../store/businessStore";
import {
    checkBusinessOpenStatus,
    transformBackendToBusiness,
} from "../utils/businessUtils";
import { Business, BackendBusiness } from "../types/business";

export const useBusinesses = () => {
    const businesses = useBusinessStore((state) => state.businesses);
    const filters = useBusinessStore((state) => state.filters);
    const isLoading = useBusinessStore((state) => state.isLoading);
    const error = useBusinessStore((state) => state.error);

    const setBusinesses = useBusinessStore((state) => state.setBusinesses);
    const setFilters = useBusinessStore((state) => state.setFilters);
    const resetFilters = useBusinessStore((state) => state.resetFilters);
    const setLoading = useBusinessStore((state) => state.setLoading);
    const setError = useBusinessStore((state) => state.setError);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const response = await fetch(`/api/businesses`);
                if (!response.ok) throw new Error("Failed to fetch businesses");
                const rawData: BackendBusiness[] = await response.json();
                const transformedBusinesses: Business[] = rawData.map(
                    transformBackendToBusiness,
                );
                setBusinesses(transformedBusinesses);
                setError(null);
            } catch (error: any) {
                setError(error.message || "Unknown error occurred");
            } finally {
                setLoading(false);
            }
        }

        if (businesses.length === 0) {
            fetchData();
        }
    }, [businesses.length, setBusinesses, setLoading, setError]);

    const filteredBusinesses = useMemo(() => {
        const {
            searchTerm = "",
            selectedCategories = [],
            selectedPrices = [],
            openNowOnly = false,
        } = filters || {};

        return businesses.filter((business) => {
            // ✅ Use correct Business type property names with null safety
            const matchesSearch =
                (business.name?.toLowerCase() || "").includes(
                    searchTerm.toLowerCase(),
                ) ||
                (business.description?.toLowerCase() || "").includes(
                    searchTerm.toLowerCase(),
                ) ||
                (business.address?.toLowerCase() || "").includes(
                    searchTerm.toLowerCase(),
                );

            const matchesCategory =
                selectedCategories.length === 0 ||
                (business.category &&
                    selectedCategories.includes(business.category));

            const matchesPrice =
                selectedPrices.length === 0 ||
                (business.priceRange &&
                    selectedPrices.includes(business.priceRange));

            const matchesOpen = openNowOnly
                ? checkBusinessOpenStatus(business).isOpen
                : true;

            return (
                matchesSearch && matchesCategory && matchesPrice && matchesOpen
            );
        });
    }, [businesses, filters]);

    return {
        businesses,
        filteredBusinesses,
        isLoading,
        error,
        setFilters,
        resetFilters,
    };
};
