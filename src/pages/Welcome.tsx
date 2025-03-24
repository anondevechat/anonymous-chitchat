
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading, signIn } = useFirebaseAuth();

  useEffect(() => {
    // Redirect to chat if already authenticated
    if (!loading && user) {
      // Create or update user document
      const createUserDoc = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // Create new user document
          await setDoc(userRef, {
            uid: user.uid,
            anonymous: user.isAnonymous,
            email: user.email || null,
            displayName: user.displayName || "Anonymous User",
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            online: true,
            available: true
          });
        } else {
          // Update last seen and online status
          await setDoc(userRef, {
            lastSeen: serverTimestamp(),
            online: true
          }, { merge: true });
        }
      };
      
      createUserDoc().then(() => {
        navigate("/chat");
      });
    }
  }, [user, loading, navigate]);

  const handleStartChatting = async () => {
    try {
      // Sign in anonymously
      await signIn();
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleLinkAccount = () => {
    // This will be implemented with Firebase authentication later
    console.log("Link Google Account clicked");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto mb-4 border-4 border-t-primary border-r-primary border-b-primary/30 border-l-primary/30 rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare className="h-12 w-12 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold">Anonymous Chat</h1>
          <p className="text-muted-foreground">
            Start chatting instantly without registration. Your privacy is our priority.
          </p>
        </div>

        <div className="space-y-4 pt-6">
          <Button 
            className="w-full py-6 text-lg"
            size="lg"
            onClick={handleStartChatting}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Start Chatting
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full py-6 text-lg"
            size="lg"
            onClick={handleLinkAccount}
          >
            <User className="mr-2 h-5 w-5" />
            Link Google Account (Optional)
          </Button>
        </div>

        <p className="pt-8 text-sm text-muted-foreground">
          By using this app, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Welcome;
