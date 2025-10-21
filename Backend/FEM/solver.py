import numpy as np
from scipy.sparse import csr_matrix

def FEM_element_based(L, Nx):
    h = L / (Nx - 1)
    
    # Initialize global stiffness matrix (K)
    K_global = np.zeros((Nx, Nx))
    
    # Local stiffness matrix for linear elements
    K_e = (1/h) * np.array([[1, -1], [-1, 1]])
    
    # Assemble global stiffness matrix
    for e in range(Nx - 1):
        K_global[e:e+2, e:e+2] += K_e
    
    # Apply Dirichlet boundary conditions (remove first/last rows/columns)
    K_global = csr_matrix(K_global[1:-1, 1:-1])
    
    return K_global, h