import { authClient } from "../../lib/authClient";

export function SessionTest() {
    // Test if useSession hook works
    const { data: session, isPending, error } = authClient.useSession();

    return (
        <div
            style={{
                padding: "20px",
                border: "2px solid blue",
                margin: "20px",
            }}
        >
            <h2>Session Test Component</h2>

            <div>
                <strong>isPending:</strong> {isPending ? "true" : "false"}
            </div>

            <div>
                <strong>Error:</strong> {error ? JSON.stringify(error) : "null"}
            </div>

            <div>
                <strong>Session Data:</strong>
                <pre
                    style={{
                        background: "#f4f4f4",
                        padding: "10px",
                        marginTop: "10px",
                    }}
                >
                    {JSON.stringify(session, null, 2)}
                </pre>
            </div>

            {session?.user && (
                <div style={{ marginTop: "10px", color: "green" }}>
                    ✅ useSession() is working! User ID: {session.user.id}
                </div>
            )}

            {!session?.user && !isPending && (
                <div style={{ marginTop: "10px", color: "orange" }}>
                    ⚠️ No active session detected
                </div>
            )}
        </div>
    );
}
