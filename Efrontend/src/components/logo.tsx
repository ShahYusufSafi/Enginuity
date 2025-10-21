//import React from "react"; // Commented out, since we only use it in react.FC way.
// We import the SVG as a React component, because this allows us to manipulate it more easily.
//import { ReactComponent as LogoIcon } from '../../assets/logo.svg';
import { ReactComponent as Log2oIcon } from '../assets/log12.svg';


interface AppLogoProps {
    size?: number; // Optional size prop to control the logo size
    className?: string; // Optional className prop for additional styling
    onClick?: () => void; // Optional click handler
    classNameIcon?: string;
}

const AppLogo = ({ size = 50, className = '',classNameIcon='',
     onClick }: AppLogoProps) => {
    return (
        <div
            className={`flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
            onClick={onClick}
        >

            <Log2oIcon 
            width={size} 
            height={size} 
            className={`${classNameIcon}`} />         
        </div>
    );
}

export default AppLogo;