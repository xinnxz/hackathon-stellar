import { useNavigate } from "react-router-dom";
import "./Hero.css";

const HeroText = ({ className = "" }) => {
    const navigate = useNavigate();

    const handleLearnMore = () => {
        navigate('/app');
    };

    return (
        <div className={`hero-text ${className}`}>
            <div className="div-framer-ge2sl">
                <div className="div-framer-ge2sl-child" />
                <div className="div-framer-se4otm">
                    <div className="agent-badge-label">
                        Stellar Trading Agent
                    </div>
                </div>
            </div>
            <div className="hero-headline-container">
                <span className="hero-headline-primary">{`Empowering Traders `}</span>
                <i className="hero-headline-accent">with AI Insights</i>
            </div>
            <div className="hero-subtext">
                Unified AI platform that aggregates on-chain metrics, executes high-frequency trades, and compounds profits recursively.
            </div>
            <button className="cta" onClick={handleLearnMore}>
                <div className="learn-more">Get started</div>
            </button>
        </div>
    );
};

export default HeroText;

