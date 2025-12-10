import { ACTIONS } from "./actions";

export function bindSocketToStore(socket, dispatch) {

    socket.on("full_state", (payload) => {
        console.log("[socket] full_state received:", payload);
        dispatch({ type: ACTIONS.FULL_STATE, payload });

        if (payload.gridId) {
            localStorage.setItem("daytrack-gridId", payload.gridId);
            dispatch({ type: ACTIONS.SET_GRID_ID, payload: payload.gridId });
        }
    });

    socket.on("instance_created", (inst) =>
        dispatch({ type: ACTIONS.UPDATE_INSTANCE, payload: inst })
    );

    socket.on("instance_updated", (inst) =>
        dispatch({ type: ACTIONS.UPDATE_INSTANCE, payload: inst })
    );

    socket.on("instance_deleted", ({ instanceId }) =>
        dispatch({ type: ACTIONS.DELETE_INSTANCE, payload: instanceId })
    );

    socket.on("container_updated", ({ containerId, items }) =>
        dispatch({
            type: ACTIONS.UPDATE_CONTAINER,
            payload: { containerId, items },
        })
    );

    socket.on("panel_updated", (panel) =>
        dispatch({ type: ACTIONS.UPDATE_PANEL, payload: panel })
    );

    socket.on("grid_updated", (grid) =>
        dispatch({ type: ACTIONS.UPDATE_GRID, payload: grid })
    );

    socket.on("auth_success", ({ token, userId }) => {
        console.log("[socket] auth_success", { token, userId });

        localStorage.setItem("daytrack-token", token);
        localStorage.setItem("daytrack-userId", userId);
        localStorage.removeItem("daytrack-gridId");

        // reload socket with new token — the cleanest method:
        window.location.reload();
    });
    socket.on("auth_error", (msg) => {
        console.log("Auth error:", msg);
        localStorage.removeItem("daytrack-token");
        localStorage.removeItem("daytrack-userId");
    });
    socket.on("connect_error", (err) => {
        console.log("Socket connect_error:", err.message);

        // If token is invalid → wipe & reload
        if (err.message === "INVALID_TOKEN" || err.message === "USER_NOT_FOUND") {
            localStorage.removeItem("daytrack-token");
            localStorage.removeItem("daytrack-userId");
            localStorage.removeItem("daytrack-gridId");
            window.location.reload();
        }
    });
    socket.on("connected_as_guest", () => {
        const hasUserId = localStorage.getItem("daytrack-userId");
        if (hasUserId) {
            console.warn("Stale token / missing user. Forcing logout.");
            localStorage.clear();
            window.location.reload();
        }
    })
}
