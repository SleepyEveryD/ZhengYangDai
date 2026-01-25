import { supabase } from "../lib/supabase";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BikeIcon, MapIcon } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showVerifyTip, setShowVerifyTip] = useState(false);

  //auto jum if already logged in
  React.useEffect(() => {
  let mounted = true;

  // 1) 初始检查（避免闪一下）
  supabase.auth.getSession().then(({ data }) => {
    if (!mounted) return;
    if (data.session) navigate("/map", { replace: true });
  });

  // 2) 监听登录/登出状态变化
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    console.log("🟡 auth state:", _event, session);
    if (session) {
      navigate("/map", { replace: true });
    }
  });

  return () => {
    mounted = false;
    sub.subscription.unsubscribe();
  };
}, [navigate]);

  
  
  // email check
  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }
  
    if (!isValidEmail(email)) {
      alert("Invalid email format");
      return;
    }
  
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
  
    console.log("🔵 signInWithPassword raw data:", data);
  
    if (error) {
      console.error("🔴 login error:", error);
      alert(error.message);
      return;
    }
  
    console.log("✅ session:", data.session);
    console.log("✅ access_token:", data.session?.access_token);
    console.log("✅ user:", data.session?.user);
  
    navigate("/map");
  };
  
  

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }
  
    if (!isValidEmail(email)) {
      alert("Invalid email format");
      return;
    }
  
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
  
    if (error) {
      alert(error.message);
      return;
    }
  
    console.log("🟣 signUp result:", data);
  
    // ✅ show alert: go to confirm email
    setShowVerifyTip(true);
  };

  const handleGuestAccess = () => {
    navigate("/map");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <BikeIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-green-600 mb-2 text-2xl font-semibold">
            Cycling Road Assistant
          </h1>
          <p className="text-gray-600">
            Smart Route Planning · Real-time Road Monitoring
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* Login */}
          <TabsContent value="login">
            
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>
                  Login to record rides and contribute road conditions
                </CardDescription>
              </CardHeader>


              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700">
                    Login
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Join us to improve cycling environment together
                </CardDescription>
              </CardHeader>
              <CardContent>
              {showVerifyTip && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  <strong>Verify your email</strong>
                  <p className="mt-1">
                    We’ve sent a verification email to your inbox.
                    <br />
                    Please verify your email before logging in.
                  </p>
                </div>
              )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700">
                    Register
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Guest */}
        <div className="mt-6">
          <Button variant="outline" className="w-full h-12" onClick={handleGuestAccess}>
            <MapIcon className="w-5 h-5 mr-2" />
            Guest Mode (View Routes Only)
          </Button>
        </div>
      </div>
    </div>
  );
}
