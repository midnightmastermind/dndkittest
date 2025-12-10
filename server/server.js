// =========================================
// server.js — Multi-Grid + Caching + Socket.io + Auth
// WITH FULL DEBUG LOGGING ADDED
// =========================================

import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";

// MODELS
import Instance from "./models/Instance.js";
import Container from "./models/Container.js";
import Panel from "./models/Panel.js";
import Grid from "./models/Grid.js";
import User from "./models/User.js";

// JWT
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET";
function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function verifyToken(token) {
    try { return jwt.verify(token, JWT_SECRET); }
    catch { return null; }
}

// -------------------------
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ========================================================
// AUTH
// ========================================================
io.use(async (socket, next) => {
    console.log("🟦 [AUTH CHECK] Incoming socket:", socket.id);

    const token = socket.handshake.auth?.token;

    if (!token) {
        console.log("🟪 No token → guest allowed");
        socket.userId = null;
        return next();
    }

    console.log("🔐 Token received:", token.substring(0, 12) + "...");

    const decoded = verifyToken(token);
    if (!decoded) {
        console.log("❌ Invalid token");
        return next(new Error("INVALID_TOKEN"));
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        console.log("❌ Token valid but user not found");
        return next(new Error("USER_NOT_FOUND"));
    }

    console.log("✅ Authenticated user:", user._id.toString());
    socket.userId = user._id.toString();
    next();
});

// ========================================================
// DATABASE
// ========================================================
mongoose
    .connect("mongodb+srv://josh:pd2235OJ@serverlessinstance0.mrxjbmd.mongodb.net/grid?retryWrites=true&w=majority&appName=ServerlessInstance0")
    .then(() => console.log("🟢 MongoDB connected"))
    .catch(err => console.error("🔴 MongoDB ERROR:", err));

// ========================================================
// CACHE
// ========================================================
const cache = {};
// cache[gridId] = { grid, panels:{}, containers:{}, instances:{} }

// ========================================================
// LOAD GRID INTO CACHE (with logging)
// ========================================================
async function loadGridIntoCache(gridId, userId) {
    console.log("\n===============================");
    console.log("📥 loadGridIntoCache START", { gridId, userId });
    console.log("===============================");

    const grid = await Grid.findOne({ _id: gridId, userId });
    if (!grid) {
        console.log("❌ GRID NOT FOUND OR UNAUTHORIZED:", gridId);
        return null;
    }

    const panels = await Panel.find({ gridId, userId });
    const containers = await Container.find({ gridId, userId });
    const instances = await Instance.find({ gridId, userId });

    const panelMap = {};
    const containerMap = {};
    const instanceMap = {};

    console.log("📊 Panels found:", panels.length);
    console.log("📊 Containers found:", containers.length);
    console.log("📊 Instances found:", instances.length);

    // -----------------------
    // PANELS
    // -----------------------
    panels.forEach(p => {
        const obj = p.toObject();
        obj.id = obj.id || obj._id.toString();
        panelMap[obj.id] = obj;
    });

    // -----------------------
    // CONTAINERS REFERENCED BY PANELS
    // -----------------------
    console.log("\n🔎 Checking panels → containers linkage...");

    panels.forEach(p => {
        if (!p.containerId) return;

        const c = containers.find(x => x.containerId === p.containerId);

        if (!c) {
            console.log(`❌ Panel '${p.id}' references missing container '${p.containerId}'`);
        } else {
            console.log(`✅ Panel '${p.id}' → Container '${c.containerId}'`);
            containerMap[c.containerId] = [...c.items];
        }
    });

    // -----------------------
    // INSTANCES REFERENCED BY CONTAINERS
    // -----------------------
    console.log("\n🔎 Checking containers → instances linkage...");

    Object.entries(containerMap).forEach(([containerId, items]) => {
        console.log(`📦 Container '${containerId}' has ${items.length} items`);

        items.forEach(instId => {
            const inst = instances.find(i => i.instanceId === instId);

            if (!inst) {
                console.log(`❌ Missing instance '${instId}' referenced by container '${containerId}'`);
            } else {
                console.log(`   ✅ Instance '${instId}' OK`);
                instanceMap[inst.instanceId] = inst.toObject();
            }
        });
    });

    // -----------------------
    // FINAL CACHE
    // -----------------------
    cache[gridId] = {
        grid: grid.toObject(),
        panels: panelMap,
        containers: containerMap,
        instances: instanceMap
    };

    console.log("\n===============================");
    console.log("✅ CACHE READY FOR GRID:", gridId);
    console.log("   Panels:", Object.keys(panelMap).length);
    console.log("   Containers:", Object.keys(containerMap).length);
    console.log("   Instances:", Object.keys(instanceMap).length);
    console.log("===============================\n");

    return cache[gridId];
}

// ========================================================
// SOCKET EVENTS
// ========================================================
io.on("connection", (socket) => {
    console.log("\n===============================================");
    console.log("🔌 Client connected:", socket.id);
    console.log("   userId:", socket.userId);
    console.log("===============================================\n");

    // ----------------------------
    // REGISTER
    // ----------------------------
    socket.on("register", async ({ email, password }) => {
        console.log("🟦 EVENT register:", { email });

        let exists = await User.findOne({ email });
        if (exists) {
            console.log("❌ Register failed: email exists");
            return socket.emit("auth_error", "Email already exists");
        }

        const user = await User.create({ email, password });
        const token = signToken({ userId: user._id });

        console.log("✅ Register success:", user._id.toString());
        socket.emit("auth_success", { token, userId: user._id.toString() });
    });

    // ----------------------------
    // LOGIN
    // ----------------------------
    socket.on("login", async ({ email, password }) => {
        console.log("🟦 EVENT login:", { email });

        const user = await User.findOne({ email });
        if (!user) {
            console.log("❌ Login failed: no such email");
            return socket.emit("auth_error", "Invalid email or password");
        }

        const match = await user.comparePassword(password);
        if (!match) {
            console.log("❌ Login failed: bad password");
            return socket.emit("auth_error", "Invalid email or password");
        }

        const token = signToken({ userId: user._id });

        console.log("✅ Login success:", user._id.toString());
        socket.emit("auth_success", { token, userId: user._id.toString() });
    });

    // ----------------------------
    // FULL STATE REQUEST
    // ----------------------------
    socket.on("request_full_state", async ({ gridId } = {}) => {
        console.log("\n🟦 EVENT request_full_state:", { gridId, userId: socket.userId });

        const userId = socket.userId;

        // CREATE NEW GRID
        if (!gridId) {
            console.log("🟨 Creating new grid for user:", userId);

            const newGrid = await Grid.create({
                rows: 2,
                cols: 3,
                rowSizes: [],
                colSizes: [],
                userId
            });

            gridId = newGrid._id.toString();

            cache[gridId] = {
                grid: newGrid,
                panels: {},
                containers: {},
                instances: {}
            };

            console.log("✅ New grid created:", gridId);

            return socket.emit("full_state", {
                gridId,
                grid: newGrid,
                panels: [],
                containers: [],
                instances: []
            });
        }

        // LOAD EXISTING GRID
        if (!cache[gridId]) {
            console.log("🟦 Cache miss → loading grid from DB...");
            const loaded = await loadGridIntoCache(gridId, userId);

            if (!loaded) {
                console.log("❌ Grid not found or unauthorized:", gridId);
                return socket.emit("error", "Grid not found or unauthorized");
            }
        }

        const data = cache[gridId];

        console.log("📤 Sending full_state response:", gridId);

        socket.emit("full_state", {
            gridId,
            grid: data.grid,
            instances: Object.values(data.instances),
            containers: Object.entries(data.containers).map(([containerId, items]) => ({
                containerId,
                items
            })),
            panels: Object.values(data.panels)
        });
    });

    // ======================================================
    // INSTANCE HANDLERS
    // ======================================================
    socket.on("create_instance", async ({ gridId, instance }) => {
        console.log("🟦 EVENT create_instance:", { gridId, instanceId: instance.instanceId });

        if (!cache[gridId]) {
            console.log("❌ Cache missing for grid, cannot create instance");
            return;
        }

        instance.userId = socket.userId;
        instance.gridId = gridId;

        cache[gridId].instances[instance.instanceId] = instance;
        await Instance.create(instance);

        console.log("✅ Instance created + cached:", instance.instanceId);
        io.emit("instance_created", instance);
    });

    socket.on("update_instance", async ({ gridId, instance }) => {
        console.log("🟦 EVENT update_instance:", { gridId, instanceId: instance.instanceId });

        if (!cache[gridId]) {
            console.log("❌ Cache missing for grid, cannot update instance");
            return;
        }

        instance.userId = socket.userId;
        instance.gridId = gridId;

        cache[gridId].instances[instance.instanceId] = instance;

        await Instance.findOneAndUpdate(
            { instanceId: instance.instanceId, userId: socket.userId },
            instance,
            { upsert: true }
        );

        console.log("✅ Instance updated:", instance.instanceId);
        io.emit("instance_updated", instance);
    });

    socket.on("delete_instance", async ({ gridId, instanceId }) => {
        console.log("🟦 EVENT delete_instance:", { gridId, instanceId });

        if (!cache[gridId]) {
            console.log("❌ Cache missing for grid, cannot delete instance");
            return;
        }

        delete cache[gridId].instances[instanceId];

        Object.keys(cache[gridId].containers).forEach(cid => {
            cache[gridId].containers[cid] =
                cache[gridId].containers[cid].filter(x => x !== instanceId);
        });

        await Instance.deleteOne({ instanceId, userId: socket.userId });

        console.log("🗑️ Instance deleted:", instanceId);
        io.emit("instance_deleted", { instanceId });
    });

    // ======================================================
    // CONTAINERS
    // ======================================================
    socket.on("update_container", async ({ gridId, containerId, items }) => {
        console.log("🟦 EVENT update_container:", { gridId, containerId, items });

        if (!cache[gridId]) {
            console.log("❌ Cache missing → cannot update container");
            return;
        }

        // Check for missing instances
        items.forEach(id => {
            if (!cache[gridId].instances[id]) {
                console.log(`❌ WARNING: update_container → missing instance '${id}' not in cache`);
            }
        });

        cache[gridId].containers[containerId] = [...items];

        await Container.findOneAndUpdate(
            { containerId, userId: socket.userId },
            { items, gridId, userId: socket.userId },
            { upsert: true }
        );

        console.log("✅ Container updated:", containerId);
        io.emit("container_updated", { containerId, items });
    });

    // ======================================================
    // PANELS
    // ======================================================
    socket.on("update_panel", async ({ gridId, panel }) => {
        console.log("🟦 EVENT update_panel:", { gridId, panelId: panel.id });

        if (!cache[gridId]) {
            console.log("❌ Cache missing → cannot update panel");
            return;
        }

        panel.userId = socket.userId;

        cache[gridId].panels[panel.id] = panel;

        await Panel.findOneAndUpdate(
            { id: panel.id, userId: socket.userId },
            panel,
            { upsert: true }
        );

        console.log("✅ Panel updated:", panel.id);
        io.emit("panel_updated", panel);
    });

    socket.on("add_panel", async ({ gridId, panel }) => {
        console.log("🟦 EVENT add_panel:", { gridId, panelId: panel.id });

        if (!cache[gridId]) {
            console.log("❌ Cache missing → cannot add panel");
            return;
        }

        const newPanel = {
            gridId,
            userId: socket.userId,
            props: {},
            ...panel
        };

        cache[gridId].panels[panel.id] = newPanel;

        await Panel.findOneAndUpdate(
            { id: panel.id, userId: socket.userId },
            newPanel,
            { upsert: true }
        );

        console.log("✅ Panel added:", panel.id);
        io.emit("panel_updated", newPanel);
    });

    // ======================================================
    // GRID UPDATE
    // ======================================================
    socket.on("update_grid", async ({ gridId, grid }) => {
        console.log("🟦 EVENT update_grid:", { gridId, grid });

        if (!cache[gridId]) {
            console.log("❌ Cache missing → cannot update grid");
            return;
        }

        cache[gridId].grid = { ...cache[gridId].grid, ...grid };

        await Grid.findOneAndUpdate(
            { _id: gridId, userId: socket.userId },
            grid,
            { upsert: false }
        );

        console.log("✅ Grid updated");
        io.emit("grid_updated", grid);
    });

    // Disconnect
    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});

// -------------------------
const PORT = 5000;
server.listen(PORT, () =>
    console.log(`\n🚀 Server running on port ${PORT}`)
);
