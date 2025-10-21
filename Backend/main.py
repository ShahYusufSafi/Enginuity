# backend/main.py

from pydantic import BaseModel

import os
import io
import uuid
import shutil
import base64
import numpy as np
import matplotlib.pyplot as plt
from scipy.sparse.linalg import spsolve
from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from FEM import FEM_element_based
from models import SimulationRequest  # keep this, remove duplicate definition

class SimulationRequest(BaseModel):
    domain: list[float|int] 
    num_elements: int 
    bc: list[float|int] 

app = FastAPI()

bind_to = {
    'hostname': "0.0.0.0",
    'port': 8000
    
    
    }

# Allow frontend to access backend (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", # Frontend dev server
        "http://frontend:5173",  # Frontend container
        "http://127.0.0.1:5173"  # Alternative localhost
        ],
    allow_methods=["*"],
    allow_headers=["*"]
)



@app.post("/simulate")
async def simulate_poisson(input: SimulationRequest):
    x = np.linspace(input.domain[0], input.domain[1], input.num_elements)
    u = np.zeros(input.num_elements)
    K,h  = FEM_element_based(input.domain[1] - input.domain[0], input.num_elements)
    b = np.sin(np.pi * x[1:-1]) 
    # Boundary conditions (Dirichlet: fixed ends)
    u[0] = input.bc[0]    # Left end (u = 0)
    u[-1] = input.bc[1]   # Right end (u = 1)

    f_vals = np.sin(np.pi * x[1:-1])
    b = f_vals * h  # basic scaling
    # Add boundary contributions
    b[0] += (1/h) * u[0] 
    b[-1] += (1/h) * u[-1]

    
    # Solve the linear system: K u_interior = b
    u_interior = spsolve(K, b)

    # Insert interior solution into u
    u[1:-1] = u_interior
    # Plot to buffer
    fig, ax = plt.subplots()
    ax.plot(x, u, 'b-', linewidth=2, label='Steady-State Solution')
    ax.set_title("FEM Solution")
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    
    # Convert image to base64
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')


    return {
        "message": "Simulation complete!",
        "data": {
                "x": x.tolist(),
                "u": u.tolist()
                }, 
        "plot": img_base64
    }





@app.get("/check")
def check():
    return "Backend!!"