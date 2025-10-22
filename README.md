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


Future Directions

 Implement higher-dimensional FEM solvers.

 Add Physics-Informed Neural Networks (PINNs).

 Enable in-browser CAD editing (three.js integration).

 Deploy to the cloud (AWS / Render / Railway).

 Add persistent storage for user projects.

 About the Author

Shah Yusuf Safi,
MSc. Computational Science — Building the bridge between engineering, computation, and simulation.

📧 [yusufsafi277@gmail.com]

🔗 LinkedIn Profile: http://linkedin.com/in/shah-yusuf-safi-6444472b7

License

This project is licensed under the MIT License
.

If you like this project, don’t forget to star the repo!
