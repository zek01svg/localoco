import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
    };

    static getDerivedStateFromError(error: Error) {
        // Update state so the next render will show fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can log the error to an error reporting service
        console.error("ErrorBoundry caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div
                    style={{
                        padding: "20px",
                        background: "#fdd",
                        color: "#a00",
                    }}
                >
                    <h2>Something went wrong.</h2>
                    <pre>{this.state.error?.message}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
