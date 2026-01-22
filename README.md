# Particles-Vortex / Luminous Resonance

An interactive particle system featuring organic flow dynamics, vortex attraction, and luminous trail effects. Thousands of autonomous particles respond to your cursor movements through carefully tuned physics and Perlin noise fields.

![Luminous Resonance](https://img.shields.io/badge/Interactive-Generative_Art-cyan?style=for-the-badge)
![p5.js](https://img.shields.io/badge/p5.js-1.7.0-orange?style=for-the-badge&logo=p5.js)

## ✨ Features

- **6,500+ Particles** - Autonomous entities with organic movement patterns
- **Vortex Attraction** - Particles swirl around your cursor with configurable strength
- **Perlin Noise Flow** - Natural, grass-like movement driven by multi-octave noise fields
- **Luminous Trails** - Velocity-based brightness with controlled persistence
- **Seed-Based Generation** - Reproducible results with seed control
- **Image Color Mapping** - Map particle colors to any uploaded image
- **Click Repulsion** - Create burst effects on mouse click
- **Customizable Parameters** - Real-time control over all physics parameters

## 🎮 How to Use

### Basic Controls
- **Move your cursor** - Creates vortex attraction, particles accelerate and swirl
- **Click** - Triggers repulsion burst effect
- **Adjust sliders** - Fine-tune all physics parameters in real-time

### Parameters

| Parameter | Description | Range | Default |
|-----------|-------------|-------|---------|
| **Particle Count** | Number of particles in the system | 1,000 - 20,000 | 6,500 |
| **Flow Speed** | Global velocity multiplier | 0.1 - 3.0 | 1.5 |
| **Noise Scale** | Perlin noise frequency (lower = smoother) | 0.001 - 0.02 | 0.001 |
| **Trail Persistence** | How long trails persist (higher = longer) | 0.5 - 2.0 | 0.9 |
| **Vortex Strength** | Attraction force toward cursor | 0 - 3.0 | 0.3 |
| **Vortex Range** | Radius of attraction effect | 50 - 800 | 600 |
| **Click Repulsion** | Burst force on click | 0 - 10 | 5 |
| **Particle Size** | Visual size multiplier | 0.5 - 3.0 | 2.5 |

### Seed Control
- **Seed Value** - Determines initial particle positions and noise field
- **← Prev / Next →** - Navigate through seeds sequentially
- **↻ Random** - Generate random seed for new variations

### Image Color Mapping
1. Upload any image using the file input
2. Check "Use Image Colors" to enable mapping
3. Particles will sample colors from the image based on their position

### Actions
- **Reset** - Restore all parameters to defaults
- **Download PNG** - Save current canvas as high-resolution image

## 🚀 Quick Start

Simply open `Luminous_Resonance.html` in any modern web browser. No build process or dependencies required.

The project uses p5.js loaded from CDN:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"></script>
```

## 🎨 Algorithm Overview

### Physics System
Particles move through a force field composed of:
1. **Perlin Noise Flow** - Base directional force from 3D noise field
2. **Radial Attraction** - Pulls particles toward cursor (inverse-distance falloff)
3. **Tangential Rotation** - Creates spiraling vortex motion
4. **Velocity Decay** - Gradual energy loss (0.5% per frame)
5. **Boundary Wrapping** - Particles respawn at edges when they leave the canvas

### Visual Design
- **Velocity-to-Brightness Mapping** - Faster particles appear brighter
- **Multi-Layer Rendering** - Outer glow, inner core, and bright center
- **Trail Persistence** - Controlled alpha fading creates flowing streams
- **Color Palette** - Cyan (#00ffff), Teal (#00ced1), Aqua (#7fffd4)

## 📊 Performance

- **Resolution**: 1920x1080 canvas
- **Frame Rate**: 60 FPS target
- **Particle Count**: 6,500 default (configurable up to 20,000)
- **Optimizations**:
  - Efficient spatial calculations
  - Batched canvas operations
  - Minimal object creation per frame

## 🎯 Technical Details

### Canvas Rendering
- Background clearing with variable alpha (prevents static patterns)
- Dual-layer particle rendering (glow + core)
- Additive brightness boost based on velocity
- Minimum alpha constraint: 20 (ensures trails don't accumulate)

### Particle Lifecycle
1. **Spawn** - Random position or edge respawn
2. **Update** - Apply forces, update position
3. **Render** - Draw with velocity-based brightness
4. **Decay** - Gradual life reduction
5. **Reset** - Respawn when life ends or out of bounds

## 🌐 Browser Compatibility

Tested on modern browsers:
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to fork this project and experiment with:
- Different color palettes
- Alternative noise functions
- Additional particle behaviors
- WebGL rendering for performance

## 📸 Gallery Tips

For best results when downloading images:
1. Let the system run for 10-20 seconds to build up trails
2. Use higher Trail Persistence (0.9-1.2) for long flowing trails
3. Interact with cursor to create dynamic vortex patterns
4. Click to create burst effects
5. Use Reset to clear canvas before capturing new compositions

## 🔗 Resources

- [p5.js Documentation](https://p5js.org/reference/)
- [Perlin Noise](https://en.wikipedia.org/wiki/Perlin_noise)
- [Particle Systems](https://natureofcode.com/book/chapter-4-particle-systems/)

---

**Created with p5.js** • Interactive Generative Art

> "This is algorithmic art at its highest level: a system so carefully crafted that it appears spontaneous, so mathematically precise that it feels organic, so meticulously refined that every parameter carries the weight of countless hours of expert refinement."
