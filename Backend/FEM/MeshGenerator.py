import numpy as np

def Mesh_Generator(nx, ny):
    # Generates a mesh grid for 2D finite element analysis.
    x = np.linspace(0, 1, nx)
    y = np.linspace(0, 1, ny)
    X, Y = np.meshgrid(x, y)
    points = np.column_stack([X.ravel(), Y.ravel()])

    triangles = []
    for i in range(ny-1):
        for j in range(nx-1):
            v0 = i*nx + j
            v1 = (i+1)*nx + j
            v2 = i*nx + j+1
            v3 = (i+1)*nx + j+1
            triangles.append([v0, v1, v2])
            triangles.append([v1, v3, v2])
    
    return points, np.array(triangles)