const DEFAULTS = {
    resolution: 256,
    trailFade: 0.085,
    pointSize: 2.4,
    chromaticAberration: 0.42,
    flowScale: 1.35,
    noiseForce: 0.95,
    attraction: 1.6,
    swirl: 1.85,
    damping: 0.965,
    burst: 2.8,
};

const state = {
    gl: null,
    extColorBufferFloat: null,
    canvas: document.getElementById('glCanvas'),
    mouse: { x: 0.5, y: 0.5, down: 0, influence: 0 },
    params: { ...DEFAULTS },
    programs: {},
    buffers: {},
    controlsBound: false,
    simulation: null,
    seed: 1337,
    frame: 0,
    lastTime: performance.now(),
    fpsTime: performance.now(),
    fpsFrames: 0,
};

const ui = {
    particleCountLabel: document.getElementById('particleCountLabel'),
    fpsLabel: document.getElementById('fpsLabel'),
    statusLabel: document.getElementById('statusLabel'),
    fallbackMessage: document.getElementById('fallbackMessage'),
    resolutionSelect: document.getElementById('resolutionSelect'),
    trailInput: document.getElementById('trailInput'),
    pointSizeInput: document.getElementById('pointSizeInput'),
    chromaticInput: document.getElementById('chromaticInput'),
    flowScaleInput: document.getElementById('flowScaleInput'),
    noiseForceInput: document.getElementById('noiseForceInput'),
    attractInput: document.getElementById('attractInput'),
    swirlInput: document.getElementById('swirlInput'),
    dampingInput: document.getElementById('dampingInput'),
    burstInput: document.getElementById('burstInput'),
    trailValue: document.getElementById('trailValue'),
    pointSizeValue: document.getElementById('pointSizeValue'),
    chromaticValue: document.getElementById('chromaticValue'),
    flowScaleValue: document.getElementById('flowScaleValue'),
    noiseForceValue: document.getElementById('noiseForceValue'),
    attractValue: document.getElementById('attractValue'),
    swirlValue: document.getElementById('swirlValue'),
    dampingValue: document.getElementById('dampingValue'),
    burstValue: document.getElementById('burstValue'),
    randomizeBtn: document.getElementById('randomizeBtn'),
    resetBtn: document.getElementById('resetBtn'),
};

const QUAD_VERT = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const SIM_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
layout(location = 0) out vec4 outPosition;
layout(location = 1) out vec4 outVelocity;

uniform sampler2D u_positionTex;
uniform sampler2D u_velocityTex;
uniform float u_time;
uniform float u_delta;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_flowScale;
uniform float u_noiseForce;
uniform float u_attraction;
uniform float u_swirl;
uniform float u_damping;
uniform float u_burst;
uniform float u_mouseDown;
uniform float u_mouseInfluence;
uniform float u_seed;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 78.233);
    return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
    float n = hash(p);
    return vec2(n, hash(p + n + 3.17));
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec2 flowField(vec2 p, float time) {
    vec2 q = p * u_flowScale;
    float layer1 = noise(q + vec2(0.0, time * 0.08 + u_seed));
    float layer2 = noise(q * 1.9 - vec2(time * 0.05, -time * 0.07));
    float layer3 = noise(q * 3.2 + vec2(time * 0.04, time * 0.03));
    float angle = (layer1 * 0.55 + layer2 * 0.3 + layer3 * 0.15) * 6.2831853 * 2.0;
    return vec2(cos(angle), sin(angle));
}

void main() {
    vec4 positionData = texture(u_positionTex, v_uv);
    vec4 velocityData = texture(u_velocityTex, v_uv);

    vec2 position = positionData.xy;
    vec2 velocity = velocityData.xy;
    float life = positionData.z;
    float variance = positionData.w;

    vec2 flow = flowField(position * 1.4 + variance, u_time);
    velocity += flow * u_noiseForce * (0.2 + variance) * u_delta;

    vec2 toMouse = u_mouse - position;
    float distanceToMouse = length(toMouse) + 0.0001;
    vec2 direction = toMouse / distanceToMouse;
    float influence = smoothstep(0.55, 0.0, distanceToMouse) * u_mouseInfluence;

    velocity += direction * u_attraction * influence * u_delta * 1.45;
    velocity += vec2(-direction.y, direction.x) * u_swirl * influence * u_delta;

    if (u_mouseDown > 0.5) {
        velocity -= direction * u_burst * influence * u_delta * 2.8;
    }

    vec2 center = position - 0.5;
    float centerDistance = dot(center, center);
    velocity += vec2(-center.y, center.x) * (0.08 + variance * 0.05) * u_delta;
    velocity += -center * centerDistance * 0.18 * u_delta;

    velocity *= pow(u_damping, 60.0 * u_delta);
    position += velocity * u_delta;

    life -= u_delta * (0.045 + variance * 0.02 + length(velocity) * 0.03);

    bool respawn = position.x < -0.05 || position.x > 1.05 || position.y < -0.05 || position.y > 1.05 || life <= 0.0;
    if (respawn) {
        vec2 rnd = hash2(v_uv * 451.0 + u_time + u_seed);
        position = 0.18 + rnd * 0.64;
        velocity = (hash2(v_uv * 902.0 + u_seed) - 0.5) * 0.04;
        life = 0.6 + rnd.x * 1.5;
        variance = rnd.y;
    }

    outPosition = vec4(position, life, variance);
    outVelocity = vec4(velocity, length(velocity), 1.0);
}`;

const PARTICLE_VERT = `#version 300 es
precision highp float;

uniform sampler2D u_positionTex;
uniform sampler2D u_velocityTex;
uniform float u_resolutionSize;
uniform float u_pointSize;
uniform vec2 u_canvasResolution;

out float v_speed;
out float v_life;
out vec2 v_uv;

void main() {
    float id = float(gl_VertexID);
    float x = mod(id, u_resolutionSize);
    float y = floor(id / u_resolutionSize);
    vec2 texelUv = (vec2(x, y) + 0.5) / u_resolutionSize;

    vec4 positionData = texture(u_positionTex, texelUv);
    vec4 velocityData = texture(u_velocityTex, texelUv);

    vec2 clip = positionData.xy * 2.0 - 1.0;
    gl_Position = vec4(clip, 0.0, 1.0);

    float speed = clamp(velocityData.z * 18.0, 0.0, 1.0);
    gl_PointSize = u_pointSize + speed * 4.0 + positionData.w * 2.0;

    v_speed = speed;
    v_life = clamp(positionData.z, 0.0, 1.5);
    v_uv = texelUv;
}`;

const PARTICLE_FRAG = `#version 300 es
precision highp float;

in float v_speed;
in float v_life;
in vec2 v_uv;
out vec4 outColor;

uniform float u_chromatic;

void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float dist = length(coord);
    if (dist > 0.5) {
        discard;
    }

    float glow = exp(-dist * dist * 14.0);
    vec3 cold = vec3(0.49, 0.83, 0.99);
    vec3 mid = vec3(0.48, 0.55, 0.98);
    vec3 hot = vec3(0.98, 0.44, 0.65);
    vec3 color = mix(cold, mid, smoothstep(0.18, 0.55, v_speed));
    color = mix(color, hot, smoothstep(0.55, 1.0, v_speed + u_chromatic * 0.12));

    float alpha = glow * (0.28 + v_speed * 0.6) * smoothstep(0.0, 0.2, v_life);
    outColor = vec4(color * glow * (1.1 + u_chromatic * 0.55), alpha);
}`;

const SCREEN_VERT = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FADE_FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_alpha;
void main() {
    outColor = vec4(0.02, 0.04, 0.09, u_alpha);
}`;

const BLIT_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_texture;
void main() {
    outColor = texture(u_texture, v_uv);
}`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || 'Shader compile failed');
    }
    return shader;
}

function createProgram(gl, vertexSource, fragmentSource, varyings) {
    const program = gl.createProgram();
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    if (varyings) {
        gl.transformFeedbackVaryings(program, varyings, gl.SEPARATE_ATTRIBS);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Program link failed');
    }
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return program;
}

function createTexture(gl, width, height, data = null) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, data);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function createRenderTexture(gl, width, height) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function createFramebuffer(gl, attachments) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    attachments.forEach((texture, index) => {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture, 0);
    });
    const buffers = attachments.map((_, index) => gl.COLOR_ATTACHMENT0 + index);
    gl.drawBuffers(buffers);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('Framebuffer incomplete');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return framebuffer;
}

function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let x = t;
        x = Math.imul(x ^ (x >>> 15), x | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

function buildSimulationTextures(gl, resolution, seed) {
    const count = resolution * resolution;
    const positionDataA = new Float32Array(count * 4);
    const velocityDataA = new Float32Array(count * 4);
    const positionDataB = new Float32Array(count * 4);
    const velocityDataB = new Float32Array(count * 4);
    const random = mulberry32(seed);

    for (let i = 0; i < count; i += 1) {
        const idx = i * 4;
        const radius = Math.sqrt(random()) * 0.3;
        const angle = random() * Math.PI * 2;
        const variance = random();
        const x = 0.5 + Math.cos(angle) * radius;
        const y = 0.5 + Math.sin(angle) * radius;
        const vx = (random() - 0.5) * 0.02;
        const vy = (random() - 0.5) * 0.02;
        const life = 0.6 + random() * 1.4;

        positionDataA[idx] = x;
        positionDataA[idx + 1] = y;
        positionDataA[idx + 2] = life;
        positionDataA[idx + 3] = variance;
        velocityDataA[idx] = vx;
        velocityDataA[idx + 1] = vy;
        velocityDataA[idx + 2] = Math.hypot(vx, vy);
        velocityDataA[idx + 3] = 1;

        positionDataB[idx] = x;
        positionDataB[idx + 1] = y;
        positionDataB[idx + 2] = life;
        positionDataB[idx + 3] = variance;
        velocityDataB[idx] = vx;
        velocityDataB[idx + 1] = vy;
        velocityDataB[idx + 2] = Math.hypot(vx, vy);
        velocityDataB[idx + 3] = 1;
    }

    const positionTexA = createTexture(gl, resolution, resolution, positionDataA);
    const velocityTexA = createTexture(gl, resolution, resolution, velocityDataA);
    const positionTexB = createTexture(gl, resolution, resolution, positionDataB);
    const velocityTexB = createTexture(gl, resolution, resolution, velocityDataB);

    return {
        resolution,
        count,
        read: {
            position: positionTexA,
            velocity: velocityTexA,
            framebuffer: createFramebuffer(gl, [positionTexB, velocityTexB]),
            writePosition: positionTexB,
            writeVelocity: velocityTexB,
        },
        write: {
            position: positionTexB,
            velocity: velocityTexB,
            framebuffer: createFramebuffer(gl, [positionTexA, velocityTexA]),
            writePosition: positionTexA,
            writeVelocity: velocityTexA,
        },
    };
}

function destroySimulation(gl, simulation) {
    if (!simulation) return;
    [simulation.read.position, simulation.read.velocity, simulation.write.position, simulation.write.velocity,
        simulation.read.framebuffer, simulation.write.framebuffer].forEach((resource) => {
        if (!resource) return;
        if (resource instanceof WebGLTexture) {
            gl.deleteTexture(resource);
        } else {
            gl.deleteFramebuffer(resource);
        }
    });
}

function createFullscreenBuffer(gl) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
    ]), gl.STATIC_DRAW);
    return buffer;
}

function bindQuad(gl, program, buffer) {
    const location = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
}

function swapSimulationTargets() {
    const previousRead = state.simulation.read;
    state.simulation.read = state.simulation.write;
    state.simulation.write = previousRead;
}

function showFallback(message) {
    ui.fallbackMessage.textContent = message;
    ui.fallbackMessage.classList.remove('hidden');
    ui.statusLabel.textContent = 'Fallback';
}

function setMetricLabels() {
    const count = state.params.resolution * state.params.resolution;
    ui.particleCountLabel.textContent = count.toLocaleString();
}

function updateControlOutput(input, output, formatter = (value) => value) {
    output.textContent = formatter(input.value);
}

const controlBindings = [
    [ui.trailInput, 'trailFade', ui.trailValue, (v) => Number(v).toFixed(3)],
    [ui.pointSizeInput, 'pointSize', ui.pointSizeValue, (v) => Number(v).toFixed(1)],
    [ui.chromaticInput, 'chromaticAberration', ui.chromaticValue, (v) => Number(v).toFixed(2)],
    [ui.flowScaleInput, 'flowScale', ui.flowScaleValue, (v) => Number(v).toFixed(2)],
    [ui.noiseForceInput, 'noiseForce', ui.noiseForceValue, (v) => Number(v).toFixed(2)],
    [ui.attractInput, 'attraction', ui.attractValue, (v) => Number(v).toFixed(2)],
    [ui.swirlInput, 'swirl', ui.swirlValue, (v) => Number(v).toFixed(2)],
    [ui.dampingInput, 'damping', ui.dampingValue, (v) => Number(v).toFixed(3)],
    [ui.burstInput, 'burst', ui.burstValue, (v) => Number(v).toFixed(1)],
];

function syncControlsFromState() {
    controlBindings.forEach(([input, key, output, formatter]) => {
        input.value = state.params[key];
        updateControlOutput(input, output, formatter);
    });
    ui.resolutionSelect.value = String(state.params.resolution);
}

function initControls() {
    syncControlsFromState();
    if (state.controlsBound) return;

    controlBindings.forEach(([input, key, output, formatter]) => {
        input.addEventListener('input', () => {
            state.params[key] = Number(input.value);
            updateControlOutput(input, output, formatter);
        });
    });

    ui.resolutionSelect.addEventListener('change', () => {
        state.params.resolution = Number(ui.resolutionSelect.value);
        rebuildSimulation();
    });

    ui.randomizeBtn.addEventListener('click', () => {
        state.seed = Math.floor(Math.random() * 1000000);
        rebuildSimulation();
    });

    ui.resetBtn.addEventListener('click', () => {
        state.params = { ...DEFAULTS };
        syncControlsFromState();
        rebuildSimulation();
    });

    state.controlsBound = true;
}

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(state.canvas.clientWidth * dpr);
    const height = Math.floor(state.canvas.clientHeight * dpr);
    if (state.canvas.width === width && state.canvas.height === height) return;

    state.canvas.width = width;
    state.canvas.height = height;

    const gl = state.gl;
    if (!gl) return;

    if (state.buffers.sceneTexture) {
        gl.deleteTexture(state.buffers.sceneTexture);
    }
    if (state.buffers.sceneFramebuffer) {
        gl.deleteFramebuffer(state.buffers.sceneFramebuffer);
    }

    state.buffers.sceneTexture = createRenderTexture(gl, width, height);
    state.buffers.sceneFramebuffer = createFramebuffer(gl, [state.buffers.sceneTexture]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, state.buffers.sceneFramebuffer);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.02, 0.04, 0.09, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function initCanvasEvents() {
    const updatePointer = (event) => {
        const rect = state.canvas.getBoundingClientRect();
        state.mouse.x = (event.clientX - rect.left) / rect.width;
        state.mouse.y = 1 - (event.clientY - rect.top) / rect.height;
        state.mouse.influence = 1;
    };

    state.canvas.addEventListener('pointermove', updatePointer);
    state.canvas.addEventListener('pointerdown', (event) => {
        updatePointer(event);
        state.mouse.down = 1;
    });
    window.addEventListener('pointerup', () => {
        state.mouse.down = 0;
    });
    state.canvas.addEventListener('pointerleave', () => {
        state.mouse.influence = 0;
        state.mouse.down = 0;
    });
    window.addEventListener('resize', resizeCanvas);
}

function initPrograms(gl) {
    state.programs.simulation = createProgram(gl, QUAD_VERT, SIM_FRAG);
    state.programs.particles = createProgram(gl, PARTICLE_VERT, PARTICLE_FRAG);
    state.programs.fade = createProgram(gl, SCREEN_VERT, FADE_FRAG);
    state.programs.blit = createProgram(gl, SCREEN_VERT, BLIT_FRAG);
}

function rebuildSimulation() {
    const gl = state.gl;
    if (!gl) return;

    ui.statusLabel.textContent = '重建中';
    destroySimulation(gl, state.simulation);
    state.simulation = buildSimulationTextures(gl, state.params.resolution, state.seed);
    setMetricLabels();
    resizeCanvas();
    ui.statusLabel.textContent = '运行中';
}

function simulate(delta, time) {
    const gl = state.gl;
    const { simulation } = state;

    gl.useProgram(state.programs.simulation);
    gl.bindFramebuffer(gl.FRAMEBUFFER, simulation.write.framebuffer);
    gl.viewport(0, 0, simulation.resolution, simulation.resolution);
    bindQuad(gl, state.programs.simulation, state.buffers.quad);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, simulation.read.position);
    gl.uniform1i(gl.getUniformLocation(state.programs.simulation, 'u_positionTex'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, simulation.read.velocity);
    gl.uniform1i(gl.getUniformLocation(state.programs.simulation, 'u_velocityTex'), 1);

    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_time'), time);
    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_delta'), delta);
    gl.uniform2f(gl.getUniformLocation(state.programs.simulation, 'u_mouse'), state.mouse.x, state.mouse.y);
    gl.uniform2f(gl.getUniformLocation(state.programs.simulation, 'u_resolution'), simulation.resolution, simulation.resolution);
    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_flowScale'), state.params.flowScale);
    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_noiseForce'), state.params.noiseForce);
    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_attraction'), state.params.attraction);
    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_swirl'), state.params.swirl);
    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_damping'), state.params.damping);
    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_burst'), state.params.burst);
    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_mouseDown'), state.mouse.down);
    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_mouseInfluence'), state.mouse.influence);
    gl.uniform1f(gl.getUniformLocation(state.programs.simulation, 'u_seed'), state.seed * 0.001);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    swapSimulationTargets();
}

function fadeScene() {
    const gl = state.gl;
    gl.useProgram(state.programs.fade);
    gl.bindFramebuffer(gl.FRAMEBUFFER, state.buffers.sceneFramebuffer);
    gl.viewport(0, 0, state.canvas.width, state.canvas.height);
    bindQuad(gl, state.programs.fade, state.buffers.quad);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(gl.getUniformLocation(state.programs.fade, 'u_alpha'), state.params.trailFade);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function drawParticles() {
    const gl = state.gl;
    gl.useProgram(state.programs.particles);
    gl.bindFramebuffer(gl.FRAMEBUFFER, state.buffers.sceneFramebuffer);
    gl.viewport(0, 0, state.canvas.width, state.canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state.simulation.read.position);
    gl.uniform1i(gl.getUniformLocation(state.programs.particles, 'u_positionTex'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, state.simulation.read.velocity);
    gl.uniform1i(gl.getUniformLocation(state.programs.particles, 'u_velocityTex'), 1);

    gl.uniform1f(gl.getUniformLocation(state.programs.particles, 'u_resolutionSize'), state.simulation.resolution);
    gl.uniform1f(gl.getUniformLocation(state.programs.particles, 'u_pointSize'), state.params.pointSize);
    gl.uniform2f(gl.getUniformLocation(state.programs.particles, 'u_canvasResolution'), state.canvas.width, state.canvas.height);
    gl.uniform1f(gl.getUniformLocation(state.programs.particles, 'u_chromatic'), state.params.chromaticAberration);

    gl.drawArrays(gl.POINTS, 0, state.simulation.count);
}

function blitToScreen() {
    const gl = state.gl;
    gl.useProgram(state.programs.blit);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, state.canvas.width, state.canvas.height);
    bindQuad(gl, state.programs.blit, state.buffers.quad);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state.buffers.sceneTexture);
    gl.uniform1i(gl.getUniformLocation(state.programs.blit, 'u_texture'), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function updateFps(now) {
    state.fpsFrames += 1;
    if (now - state.fpsTime >= 500) {
        const fps = state.fpsFrames * 1000 / (now - state.fpsTime);
        ui.fpsLabel.textContent = fps.toFixed(0);
        state.fpsFrames = 0;
        state.fpsTime = now;
    }
}

function frame(now) {
    const delta = Math.min((now - state.lastTime) / 1000, 0.033);
    state.lastTime = now;
    state.frame += 1;

    state.mouse.influence *= state.mouse.down ? 1 : 0.985;

    simulate(delta, now * 0.001);
    fadeScene();
    drawParticles();
    blitToScreen();
    updateFps(now);

    requestAnimationFrame(frame);
}

function init() {
    const gl = state.canvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        preserveDrawingBuffer: false,
    });

    if (!gl) {
        showFallback('当前浏览器或运行环境不支持 WebGL2，无法运行 GPU 粒子系统。');
        return;
    }

    state.gl = gl;
    state.extColorBufferFloat = gl.getExtension('EXT_color_buffer_float');
    if (!state.extColorBufferFloat) {
        showFallback('缺少 EXT_color_buffer_float 扩展，无法启用浮点状态纹理模拟。');
        return;
    }

    gl.getExtension('OES_texture_float_linear');
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    state.buffers.quad = createFullscreenBuffer(gl);
    state.buffers.vao = gl.createVertexArray();
    gl.bindVertexArray(state.buffers.vao);

    initPrograms(gl);
    initControls();
    initCanvasEvents();
    resizeCanvas();
    rebuildSimulation();

    gl.bindFramebuffer(gl.FRAMEBUFFER, state.buffers.sceneFramebuffer);
    gl.viewport(0, 0, state.canvas.width, state.canvas.height);
    gl.clearColor(0.02, 0.04, 0.09, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    ui.statusLabel.textContent = '运行中';
    requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', init);
