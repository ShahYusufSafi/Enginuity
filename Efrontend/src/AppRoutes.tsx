import { Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import P1D from "./pages/p1d";
import DrawPage from "./pages/DrawPage";
import HomePage from "./pages/HomePage";
import SignInPage from "./Layouts/SignIn";

import MainLayout from "./Layouts/MainLayout";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";
import Dashboard from "./pages/Dashboard";
import Workbench from "./pages/Workbench";

export default function AppRoutes() {
  return (
    
    <Routes>
      {/*<Route path="/Vite" element = {<App/>}/>
      <Route path="/" element={<Navigate to="/simulate" replace />} />
      <Route path = "/simulate" element = {<P1D/>} />
      <Route path="/draw" element = {<DrawPage/>} />
      <Route path="*" element = {<div>404: Page not found</div>} />
      */}
      <Route path="/Vite" element = {<App/>}/>
      <Route path="/sign-in/*" element={<SignInPage />} />
      

      <Route path="/" element={
          <MainLayout>
            <SignedIn>
                <HomePage/>
            </SignedIn>

            <SignedOut>
              {/*<Navigate to ='/sign-in' replace/>*/}
               <RedirectToSignIn/>
            </SignedOut>
          </MainLayout>
        } />    
      <Route path = "/simulate" element = {
        <SignedIn>
          <P1D/>
        </SignedIn>
        } />

      <Route path = "/dashboard" element = {
        <SignedIn>
          <Dashboard/>
        </SignedIn>
      } />

      <Route path = "/Workbench/:id" element = {
        <SignedIn>
          <Workbench/>
        </SignedIn>
      } />

      <Route path="/draw" element = {
        <SignedIn>
        <DrawPage/>
        </SignedIn>
        } />
      <Route path="*" element = {<div>404: Page not found</div>} />
    </Routes>
       
    
  );
}
