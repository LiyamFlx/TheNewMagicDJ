import { useState } from 'react';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Any email and password combination is valid
    const user = { id: email, email };
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-cyber-black flex items-center justify-center">
      <div className="max-w-md w-full p-8 glass-card">
        <h1 className="text-3xl font-bold text-center text-gradient-primary mb-8">Login</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2" htmlFor="email">
              Email
            </label>
            <input
              className="w-full p-3 bg-cyber-dark border border-neon-green rounded-sm focus:outline-none focus:border-neon-purple"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="w-full p-3 bg-cyber-dark border border-neon-green rounded-sm focus:outline-none focus:border-neon-purple"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="w-full py-3 btn-primary font-bold"
            type="submit"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
