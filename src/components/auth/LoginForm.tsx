import React, { useState } from 'react';
import { useAuth } from '../../stores/authStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function LoginForm() {
  const [seed, setSeed] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithSeed, loginAdmin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seed.trim()) return;
    
    setLoading(true);
    try {
      await loginWithSeed(seed);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      // Prova con seed admin
      const adminSeed = "clutch captain shoe salt awake harvest setup primary inmate ugly aeon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";
      await loginAdmin(adminSeed);
    } catch (error) {
      console.error('Admin login error:', error);
    } finally {
      setLoading(false);
    }
  };

  console.log("🔍 LoginForm renderizzato");

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Form principale */}
      <Card>
        <CardHeader>
          <CardTitle>TRUSTUP • MOCK</CardTitle>
          <CardDescription>UI base shadcn pronta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Seed phrase</label>
              <Input
                type="text"
                placeholder="inserisci le 12/24 parole..."
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !seed.trim()}>
              {loading ? 'Caricamento...' : 'Continua'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* SEZIONE ADMIN - SEMPRE VISIBILE PER TEST */}
      <Card className="border-red-500 bg-red-950/20">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            🛡️ Accesso Amministratore
          </CardTitle>
          <CardDescription className="text-red-300">
            Area riservata per amministratori di sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-red-300">
            <div>🔍 Debug Info:</div>
            <div>• Admin seed: ✅ FORZATA PER TEST</div>
            <div>• Status: 🟢 ATTIVO</div>
          </div>
          
          <Button 
            onClick={handleAdminLogin}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            🔑 Accedi come Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}