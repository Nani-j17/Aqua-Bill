# Aqua-Bill - Water Billing Management System

A modern, responsive water billing management system built with React.js, Supabase, and Tailwind CSS.

## 🌟 Features

### User Features
- **Dashboard**: Real-time water usage analytics and monitoring
- **Billing Management**: View bills, payment history, and payment methods
- **Profile Management**: Update personal information and account settings
- **Support System**: Submit support requests and get responses
- **Real-time Updates**: Live data updates every second
- **Payment Integration**: Razorpay payment gateway integration

### Admin Features
- **Admin Dashboard**: Manage support requests and user inquiries
- **Support Management**: View and respond to user support requests
- **User Management**: Monitor user activities and requests

## 🚀 Tech Stack

- **Frontend**: React.js, Tailwind CSS, Framer Motion
- **Backend**: Supabase (Database, Authentication, Storage)
- **Payment**: Razorpay Integration
- **Charts**: Chart.js
- **Icons**: React Icons
- **Date Handling**: Day.js, Date-fns

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- Razorpay account (for payments)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nani-j17/aquabill.git
   cd aquabill
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key_id
   REACT_APP_RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

## 🗄️ Database Setup

### Required Tables

1. **profiles** - User profile information
2. **flow_data** - Water usage data
3. **bills** - Billing information
4. **support_requests** - Support request submissions
5. **support_responses** - Admin responses to support requests
6. **notifications** - User notifications
7. **payments** - Payment records

### Row Level Security (RLS) Policies

Enable RLS on all tables and create appropriate policies for user access.

## 🔐 Authentication

- **User Login**: Email/password authentication via Supabase
- **Admin Access**: Special admin account (admin@aquabill.com)
- **Session Management**: Automatic session handling

## 💳 Payment Integration

- **Razorpay**: Integrated payment gateway
- **Payment Methods**: UPI, Cards, Net Banking
- **Payment History**: Complete payment tracking

## 📊 Features Overview

### Dashboard
- Real-time water usage monitoring
- Daily, weekly, and monthly analytics
- Water level indicators
- Notification system

### Billing
- Bill generation and management
- Payment processing
- Payment method management
- Export functionality

### Support
- Support request submission
- Admin response system
- FAQ section
- Live chat support

### Profile
- Personal information management
- Account settings
- Profile photo upload
- Mobile verification

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Modern UI**: Clean and intuitive interface
- **Animations**: Smooth transitions with Framer Motion
- **Dark/Light Theme**: Gradient backgrounds
- **Loading States**: User-friendly loading indicators

## 🔧 Configuration

### Supabase Configuration
1. Create a new Supabase project
2. Set up the required tables
3. Configure RLS policies
4. Add environment variables

### Razorpay Configuration
1. Create Razorpay account
2. Get API keys
3. Configure webhook endpoints
4. Test payment integration

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Nani-j17**
- GitHub: [@Nani-j17](https://github.com/Nani-j17)

## 🙏 Acknowledgments

- Supabase for backend services
- Razorpay for payment integration
- React.js community
- Tailwind CSS team

## 📞 Support

For support and queries, please contact:
- Email: support@aquabill.com
- GitHub Issues: [Create an issue](https://github.com/Nani-j17/aquabill/issues)

---

**Aqua-Bill** - Modern Water Billing Management System 