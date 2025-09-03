# Booking Frontend

A React.js application built with Vite for managing seat bookings.

## Features

- Interactive seat map visualization
- Real-time seat availability
- Booking form with validation
- Responsive design
- TypeScript support

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### API Integration

The frontend expects a backend API running on `http://localhost:3001` with the following endpoints:

- `GET /api/seatrows` - Fetch seat row data
- `POST /api/bookings` - Create new booking

### Project Structure

```
src/
├── components/
│   ├── BookingForm.tsx
│   ├── BookingPage.tsx
│   ├── Header.tsx
│   └── SeatMap.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## Technologies Used

- React 18
- TypeScript
- Vite
- React Router
- Axios
- CSS3
