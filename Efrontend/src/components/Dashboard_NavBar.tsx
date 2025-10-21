import { tool } from "../utils/DashboardNavTools";
import styles from '../styles/NavBar.module.css';
import AppLogo from "./logo";
import { SignedIn, UserButton} from "@clerk/clerk-react";
import styles_logo from '../styles/AppLogo.module.css';
import { ModeToggle } from "./mode-toggle";


export default function NavBar() {

    return (
        <nav className={styles.navbar}>
        
        <a className={styles.logo_link}>
            <AppLogo 
            className={styles_logo.logo} 
            classNameIcon={styles_logo.Icon}
            onClick={()=> (window.location.href = '/')}
            />
        </a>

        <ul className={styles.navList}>
            {Object.values(tool).map((t)=> (
                <li key={t.id} className={styles.navItem}>
                    <a onClick={t.action}>{t.name}</a>
                </li>
            ))}
        </ul>
        <ModeToggle/>
        <div className="auth-buttons">   
            
            <SignedIn>
                <UserButton >
                    <UserButton.MenuItems>
                    <UserButton.Link
                    label="Dashboard"
                    labelIcon={<span>📊</span>}
                    href="/dashboard"
                    />
                    
                    </UserButton.MenuItems>
                </UserButton>
            </SignedIn>
        </div>
        </nav>
    );
}