import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/components.css';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`app-footer ${className}`}>
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-brand">
            <h4>CRM Dynamics 365 Integration</h4>
            <p>Comprehensive CRM solution integrating Dynamics 365, NAV 2017, and Cosmos DB</p>
          </div>
        </div>
        
        <div className="footer-section">
          <h5>Quick Links</h5>
          <ul className="footer-links">
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/customers">Customers</Link></li>
            <li><Link to="/sales">Sales</Link></li>
            <li><Link to="/products">Products</Link></li>
            <li><Link to="/integration">Integration</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h5>Support</h5>
          <ul className="footer-links">
            <li><Link to="/help">Help Center</Link></li>
            <li><Link to="/documentation">Documentation</Link></li>
            <li><Link to="/contact">Contact Support</Link></li>
            <li><Link to="/api-docs">API Documentation</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h5>System Status</h5>
          <div className="system-status">
            <div className="status-item">
              <span className="status-indicator online"></span>
              <span>Dynamics 365</span>
            </div>
            <div className="status-item">
              <span className="status-indicator online"></span>
              <span>NAV 2017</span>
            </div>
            <div className="status-item">
              <span className="status-indicator online"></span>
              <span>Cosmos DB</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>&copy; {currentYear} CRM Dynamics 365 Integration. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/security">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;