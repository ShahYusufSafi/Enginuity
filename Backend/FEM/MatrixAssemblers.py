from scipy.sparse import lil_matrix, csr_matrix
import numpy as np


def assemble_stiffness_2D(points, triangles):
    """Assemble the 2D stiffness matrix for linear triangular elements"""
    N = len(points)
    K = lil_matrix((N, N))
    
    for tri in triangles:
        # Get the three vertices of the triangle
        i1, i2, i3 = tri
        p1, p2, p3 = points[i1], points[i2], points[i3]
        
        # Compute element stiffness matrix
        area = 0.5 * abs((p2[0]-p1[0])*(p3[1]-p1[1]) - (p3[0]-p1[0])*(p2[1]-p1[1]))
        b1 = p2[1] - p3[1]
        b2 = p3[1] - p1[1]
        b3 = p1[1] - p2[1]
        c1 = p3[0] - p2[0]
        c2 = p1[0] - p3[0]
        c3 = p2[0] - p1[0]
        
        
        Ke = (1/(4*area)) * np.array([
            [b1*b1 + c1*c1, b1*b2 + c1*c2, b1*b3 + c1*c3],
            [b2*b1 + c2*c1, b2*b2 + c2*c2, b2*b3 + c2*c3],
            [b3*b1 + c3*c1, b3*b2 + c3*c2, b3*b3 + c3*c3]
        ])
        
        # Add to global matrix
        for local_i, global_i in enumerate(tri):
            for local_j, global_j in enumerate(tri):
                K[global_i, global_j] += Ke[local_i, local_j]
    
    return csr_matrix(K)

def apply_boundary_conditions(K, points, Lx, Ly, tol=1e-6):
    """Apply Dirichlet boundary conditions (fixed on all sides)"""
    boundary_nodes = np.where(
        (points[:, 0] < tol) | (points[:, 0] > Lx-tol) |
        (points[:, 1] < tol) | (points[:, 1] > Ly-tol)
    )[0]
    interior_nodes = np.array([i for i in range(len(points)) if i not in boundary_nodes])
    
    K = K[interior_nodes[:, None], interior_nodes]
    return K, interior_nodes, boundary_nodes

def assemble_load_vector(points, triangles, f):
    N = len(points)
    b = np.zeros(N)

    for tri in triangles:
        i1, i2, i3 = tri
        p1, p2, p3 = points[i1], points[i2], points[i3]

        # Compute triangle area
        area = 0.5 * abs((p2[0]-p1[0])*(p3[1]-p1[1]) - (p3[0]-p1[0])*(p2[1]-p1[1]))

        # Compute centroid of triangle
        xc = (p1[0] + p2[0] + p3[0]) / 3
        yc = (p1[1] + p2[1] + p3[1]) / 3

        f_val = f(xc, yc)

        # Lumped mass: each node gets 1/3 of triangle contribution
        for idx in [i1, i2, i3]:
            b[idx] += f_val * area / 3

    return b
