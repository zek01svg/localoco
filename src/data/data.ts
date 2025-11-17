import { useState, useEffect } from "react";
import { url } from "../constants/url";

import axios from "axios";

export default function BusinessesLoader() {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios
            .get(`${url}/api/businesses`)
            .then((response) => {
                setBusinesses(response.data);
            })
            .catch((error) => {
                console.error("Failed to fetch businesses:", error);
            })
            .finally(() => setLoading(false));
    }, []);
}
