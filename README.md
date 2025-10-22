# Enginuity Cloud Solver

**Enginuity** is a cloud-based engineering platform designed to bring CAD, simulation, and computational solvers together — **no external software required**.  
Upload your CAD file, visualize it, and run solvers directly in the browser.

---

## Features

✅ **User Authentication** – Secure sign-in using Clerk services.  
✅ **Dashboard** – Upload your CAD files and visualize them as SVGs.  
✅ **1D FEM Solver (Demo)** – Proof-of-concept solver that demonstrates working finite element analysis.  
✅ **Theme Switching** – Toggle between light and dark themes.  
✅ **Drawing Page** – Draw and measure geometry interactively (prototype).  
✅ **Simulation Page** – Placeholder for advanced computational solvers (FEM / PINN).  

---

## Tech Stack

| Layer      | Technology |
|-------------|-------------|
| Frontend | React (Vite) + TypeScript + TailwindCSS |
| Backend | FastAPI (Python) |
| Conversion | ODAFileConverter.AppImage (running inside container) |
| Containerization | Docker + Docker Compose |
| Authentication | Clerk |
| Future Solvers | FEM, PINN, Statistical Solvers |


---

##  Getting Started

### 1️ Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

### 2️ Clone the Repository
```bash
git clone https://github.com/Shahyusufsafi/Enginuity.git
cd enginuity
```
3️ Build and Run
```bash
docker-compose up --build
```



That’s it! 
You can now visit:

 → http://localhost:5173 # or follow the link provided, for the frontend 


Usage Guide
1. Convert a DWG File to SVG

Open the Dashboard (accessible via the user menu or navigation bar).

Click Create New.

Upload a DWG file (e.g., sample.dwg).

The backend automatically converts it — the resulting SVG file appears on the new page and is stored under /SVGs/sample.svg.

The frontend then renders the SVG automatically.

2. Run the FEM Solver Demo

Navigate to FEM Simulation from the navigation bar.

Adjust the simulation parameters — the current version supports 1D systems, with 2D simulations coming in future updates.

The solver demonstrates the project’s computational core, which integrates FEM-based PDE solvers with drawing and visualization modules.

The internal production rate of the system currently follows a sine function for demonstration purposes.

3. Drawer Page

Go to Draw from the navigation bar.

You can draw points, connect them, and measure distances between them.

Future updates will enable direct integration with DWG files, allowing in-browser editing and CAD-level modifications.

---

Future Directions

 Implement higher-dimensional FEM solvers.

 Add Physics-Informed Neural Networks (PINNs).

 Enable in-browser CAD editing (three.js integration).

 Deploy to the cloud (AWS / Render / Railway).

 Add persistent storage for user projects.
 ---

 About the Author

Shah Yusuf Safi,
MSc. Computational Science — Building the bridge between engineering, computation, and simulation.

📧 [yusufsafi277@gmail.com]

🔗 LinkedIn Profile: http://linkedin.com/in/shah-yusuf-safi-6444472b7

License

This project is licensed under the MIT License
.

If you like this project, don’t forget to star the repo!
