# Aqua Bill

A modern water billing management system built with React and Supabase.

## Features

- **User Authentication**: Secure login and registration system
- **Dashboard**: Overview of billing information and usage statistics
- **Billing Management**: Create, view, and manage water bills
- **Admin Panel**: Administrative controls and user management
- **Profile Management**: User profile settings and preferences
- **Support System**: Customer support and help desk
- **Payment Integration**: Razorpay payment gateway integration

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Tailwind CSS with Framer Motion animations
- **Charts**: Chart.js for data visualization
- **Icons**: Lucide React and React Icons
- **Routing**: React Router DOM

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Nani-j17/Aqua_Bill.git
   cd Aqua_Bill
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
src/
├── components/          # React components
├── services/           # API services and utilities
├── supabaseClient.js   # Supabase client configuration
├── App.jsx            # Main application component
├── index.js           # Application entry point
└── index.css          # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository or contact the development team.
