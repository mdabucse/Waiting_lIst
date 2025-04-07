import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilRuler, ChevronRight, X, Users, LineChart,Video, Bot, Mic, ListOrdered, Twitter, Instagram, Linkedin, CheckCircle, PenBox } from 'lucide-react';

// --- Google Auth Only (No Firestore) ---
import { GoogleAuthProvider, signInWithPopup, User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/firebaseConfig'; // Only import auth, not db
import toast, { Toaster } from 'react-hot-toast';

// Define possible submission statuses
type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'already_joined' | 'error';

function App() {
    const [showModal, setShowModal] = useState(false);
    const [formStep, setFormStep] = useState<'auth' | 'details'>('auth');
    const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
    const [currentUser, setCurrentUser] = useState<User | null>(null); // Use Firebase User type
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        experienceLevel: '',
        interests: [] as string[],
        expectations: ''
    });

    // --- Check if user has already registered using localStorage ---
    const checkIfUserRegistered = (email: string) => {
        if (!email) return false;
        const registeredEmails = localStorage.getItem('registeredEmails');
        if (registeredEmails) {
            try {
                const emails = JSON.parse(registeredEmails);
                return emails.includes(email);
            } catch (e) {
                console.error("Error parsing localStorage data", e);
                return false;
            }
        }
        return false;
    };

    // --- Save registered email to localStorage ---
    const saveUserEmail = (email: string) => {
        if (!email) return;
        try {
            const registeredEmails = localStorage.getItem('registeredEmails');
            let emails = [];
            if (registeredEmails) {
                emails = JSON.parse(registeredEmails);
            }
            if (!emails.includes(email)) {
                emails.push(email);
                localStorage.setItem('registeredEmails', JSON.stringify(emails));
            }
        } catch (e) {
            console.error("Error saving to localStorage", e);
        }
    };

    // --- Effect to check auth state and registration status ---
    useEffect(() => {
        // Use Firebase onAuthStateChanged for authentication
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user && user.email) {
                // User is signed in
                console.log("User signed in:", user.uid);
                
                // Check if this email is already registered
                const isRegistered = checkIfUserRegistered(user.email);
                if (isRegistered) {
                    console.log("User already registered with email:", user.email);
                    setSubmissionStatus('already_joined');
                }
                
                setFormData(prev => ({
                    ...prev,
                    email: prev.email || user.email || ''
                }));
            } else {
                console.log("User signed out.");
                setSubmissionStatus('idle');
            }
        });

        return () => unsubscribe();
    }, []);

    // --- Google Sign-In Handler ---
    const handleGoogleSignIn = async () => {
        if (submissionStatus === 'success' || submissionStatus === 'already_joined') {
            toast.success('You have already joined the waitlist!');
            setShowModal(false);
            return;
        }
        
        if (currentUser) {
            console.log("User already logged in, checking registration status...");
            
            if (currentUser.email && checkIfUserRegistered(currentUser.email)) {
                console.log("User already registered with email:", currentUser.email);
                setSubmissionStatus('already_joined');
                toast.success('You have already joined the waitlist!');
                setShowModal(false);
                return;
            }
            
            setFormData(prev => ({ ...prev, email: currentUser.email || prev.email }));
            setFormStep('details');
            return;
        }

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            console.log("Google Sign-In successful for:", user.uid);

            setFormData(prev => ({
                ...prev,
                email: user.email || ''
            }));
            
            // Check if this email is already registered
            if (user.email && checkIfUserRegistered(user.email)) {
                console.log("User already registered with email:", user.email);
                setSubmissionStatus('already_joined');
                toast.success('You have already joined the waitlist!');
                setShowModal(false);
                return;
            }
            
            setFormStep('details');

        } catch (error: any) {
            if (error.code === 'auth/popup-closed-by-user') {
                toast.error('Sign-in cancelled.');
            } else {
                console.error("Google Sign-In Error:", error);
                toast.error('Failed to sign in with Google. Please try again.');
            }
            setSubmissionStatus('error');
        }
    };

    // --- Form Submission Handler (stores in localStorage) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submissionStatus === 'submitting' || submissionStatus === 'success' || submissionStatus === 'already_joined') {
            console.log("Submission prevented:", submissionStatus);
            return;
        }

        if (!currentUser) {
            toast.error('Authentication error. Please sign in again.');
            setSubmissionStatus('error');
            setFormStep('auth');
            return;
        }

        setSubmissionStatus('submitting');
        
        try {
            // Check if already registered
            if (currentUser.email && checkIfUserRegistered(currentUser.email)) {
                toast.success('You have already joined the waitlist!');
                setSubmissionStatus('already_joined');
                setShowModal(false);
                return;
            }
            
            // Instead of storing in DB, store in localStorage and log the form data
            console.log("Form data collected:", {
                userId: currentUser.uid,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                experienceLevel: formData.experienceLevel,
                interests: formData.interests,
                expectations: formData.expectations,
                joinedAt: new Date()
            });
            
            // Save email to localStorage to track registration
            if (currentUser.email) {
                saveUserEmail(currentUser.email);
            }
            
            // Simulate a short delay
            setTimeout(() => {
                toast.success('Successfully joined the waitlist!');
                setSubmissionStatus('success');
                setShowModal(false);
    
                // Reset form fields and step
                setFormData({
                    firstName: '', lastName: '', email: '', experienceLevel: '', interests: [], expectations: ''
                });
                setFormStep('auth');
            }, 1000);

        } catch (error) {
            console.error("Form Submission Error:", error);
            toast.error('Failed to join waitlist. Please try again.');
            setSubmissionStatus('error');
        }
    };

    // --- Function to handle opening the modal ---
    const openModal = () => {
        if (submissionStatus === 'success' || submissionStatus === 'already_joined') {
            // Already joined, just show the success message
            setShowModal(true);
            return;
        }
            
        // Check if already registered when opening modal
        if (currentUser && currentUser.email && checkIfUserRegistered(currentUser.email)) {
            setSubmissionStatus('already_joined');
            setShowModal(true);
            return;
        }
            
        if (currentUser) {
            setFormStep('details');
            setFormData(prev => ({ ...prev, email: currentUser.email || prev.email }));
        } else {
            setFormStep('auth');
        }
        
        if (submissionStatus === 'error') {
            setSubmissionStatus('idle');
        }
        setShowModal(true);
    };

    // --- Determine Button State ---
    const isJoined = submissionStatus === 'success' || submissionStatus === 'already_joined';
    const joinButtonText = isJoined ? "Successfully Joined!" : "Join Waitlist";
    const joinButtonIcon = isJoined ? <CheckCircle className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />;
    const joinButtonClasses = isJoined
        ? "bg-green-600 text-white px-4 py-2 rounded-lg font-medium cursor-not-allowed opacity-75"
        : "bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors";

    const heroJoinButtonClasses = isJoined
        ? "flex items-center justify-center space-x-2 bg-green-600 text-white px-8 py-4 rounded-lg font-medium cursor-not-allowed opacity-75"
        : "flex items-center justify-center space-x-2 bg-purple-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-purple-700 transition-colors";


    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
            <Toaster position="top-center" reverseOrder={false} />
            {/* Header */}
            <header className="fixed w-full bg-[#0A0A0A]/80 backdrop-blur-sm z-50 border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <PencilRuler className="h-8 w-8 text-purple-500" />
                            <span className="text-xl font-bold">Sketch<span className="text-purple-500">Mentor</span></span>
                        </div>
                        <nav className="hidden md:flex space-x-8">
                            <a href="#features" className="text-gray-300 hover:text-white">Features</a>
                            <a href="#how-it-works" className="text-gray-300 hover:text-white">How It Works</a>
                            <a href="#join" className="text-gray-300 hover:text-white">Join Waitlist</a>
                        </nav>
                        <button
                            onClick={openModal}
                            className={joinButtonClasses}
                            disabled={isJoined}
                        >
                            <span className="mr-1">{joinButtonText}</span>
                            {joinButtonIcon}
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-32 pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
                            Empower Your Math Journey With <br /><span className="text-purple-500">Real-Time AI Assistance</span><br />
                            </h1>
                            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                            Get instant feedback, explore step-by-step solutions, and understand complex math topics with personalized AI tutoring.                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="flex flex-col sm:flex-row justify-center gap-4 mb-16"
                        >
                            <button
                                onClick={openModal}
                                className={heroJoinButtonClasses}
                                disabled={isJoined}
                            >
                                <span>{joinButtonText}</span>
                                {joinButtonIcon}
                            </button>
                        </motion.div>

                        <div className="flex items-center justify-center space-x-2 text-gray-400">
                            <Users className="h-5 w-5" />
                            <span>200+ designers already on the waitlist</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Features Grid */}
            <section id="features" className="py-20 bg-[#111111]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center mb-4">
                        Why Choose <span className="text-purple-500">Sketch</span> <span className="text-blue-500">Mentor</span>
                    </h2>
                    <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
                    Our platform offers powerful AI tools to help you truly understand math and become a more confident problem solver.
                    </p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard icon={<Video className="h-8 w-8 text-orange-500" />} title="AI-Generated Video Explanations" description="Get automatically generated visual guides and animated walkthroughs tailored to your questions." />
                        <FeatureCard icon={<PenBox className="h-8 w-8 text-purple-500" />} title="Real-Time Equation Solving" description="Write math problems directly on our canvas and receive instant, step-by-step solutions." />
                        <FeatureCard icon={<LineChart className="h-8 w-8 text-teal-500" />} title="Interactive Graph Visualizer" description="Watch equations transform into real-time, interactive graphs to deepen your understanding." />
                        <FeatureCard icon={<Bot className="h-8 w-8 text-purple-500" />} title="Smart AI Chatbot (RAG-Based)" description="Ask questions and receive context-aware answers drawn from video transcripts and math content." />
                        <FeatureCard icon={<Mic className="h-8 w-8 text-teal-500" />} title="Audio-to-Text Transcription" description="Turn spoken lectures and tutorials into searchable, readable content using Whisper AI." />
                        <FeatureCard icon={<ListOrdered className="h-8 w-8 text-orange-500" />} title="Step-by-Step Learning Journey" description="Learn at your own pace with detailed, guided breakdowns of complex problems and concepts." />
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            

            {/* Join Section */}
            <section id="join" className="py-20 bg-[#111111] text-center">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold mb-4">Ready to Elevate Your Design Career?</h2>
                    <p className="text-gray-400 mb-8">Join the SketchMentor waitlist today and be the first to access personalized mentorship.</p>
                    <button
                        onClick={openModal}
                        className={`${heroJoinButtonClasses} mx-auto`}
                        disabled={isJoined}
                    >
                        <span>{joinButtonText}</span>
                        {joinButtonIcon}
                    </button>
                </div>
            </section>


            {/* Footer */}
            <footer className="bg-[#0A0A0A] border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div className="flex items-center space-x-2">
                            <PencilRuler className="h-8 w-8 text-purple-500" />
                            <span className="text-xl font-bold">Sketch<span className="text-purple-500">Mentor</span></span>
                        </div>
                        <p className="text-gray-400 text-sm md:text-right">Learn Visualize Solve</p>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-800 pt-8 gap-4">
                        <div className="text-gray-400 text-sm order-2 md:order-1">
                            © {new Date().getFullYear()} Sketch Mentor. All rights reserved.
                        </div>
                        <div className="flex items-center space-x-6 md:space-x-8 order-1 md:order-2">
                            <a href="#" className="text-gray-400 hover:text-white text-sm">Privacy Policy</a>
                            <a href="#" className="text-gray-400 hover:text-white text-sm">Terms of Service</a>
                            <div className="flex items-center space-x-4">
                                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white"><Twitter className="h-5 w-5" /></a>
                                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white"><Instagram className="h-5 w-5" /></a>
                                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white"><Linkedin className="h-5 w-5" /></a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors" aria-label="Close modal">
                                <X className="h-6 w-6" />
                            </button>

                            {/* Conditional Rendering based on submission status */}
                            {submissionStatus === 'success' || submissionStatus === 'already_joined' ? (
                                // --- Success/Already Joined View ---
                                <div className="text-center py-8">
                                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold mb-2">You're on the list!</h2>
                                    <p className="text-gray-400">
                                        {submissionStatus === 'already_joined' 
                                            ? 'You have already joined the SketchMentor waitlist. We\'ll notify you when we launch!'
                                            : 'Thanks for joining the SketchMentor waitlist. We\'ll notify you when we launch!'}
                                    </p>
                                </div>
                            ) : formStep === 'auth' ? (
                                // --- Auth Step (Only shown if user is not logged in) ---
                                <div className="text-center">
                                    <PencilRuler className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold mb-3">Join the Waitlist</h2>
                                    <p className="text-gray-400 mb-8">
                                        Sign in with Google to get started. Be the first to know when SketchMentor launches!
                                    </p>
                                    <button
                                        onClick={handleGoogleSignIn}
                                        className="w-full bg-white text-gray-800 py-3 rounded-lg font-medium flex items-center justify-center space-x-3 hover:bg-gray-200 transition-colors duration-200 border border-gray-300"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /><path fill="none" d="M0 0h48v48H0z" /></svg>
                                        <span>Continue with Google</span>
                                    </button>
                                    {submissionStatus === 'error' && (
                                        <p className="text-red-500 text-sm mt-4">Sign-in failed. Please try again.</p>
                                    )}
                                </div>
                            ) : (
                                // --- Details Step (Shown after successful sign-in) ---
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <h2 className="text-2xl font-bold mb-4 text-center">Complete Your Profile</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                                            <input id="firstName" type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white border border-gray-700 focus:border-purple-500 focus:ring-purple-500 focus:outline-none" required placeholder="e.g., Alex" />
                                        </div>
                                        <div>
                                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                                            <input id="lastName" type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white border border-gray-700 focus:border-purple-500 focus:ring-purple-500 focus:outline-none" required placeholder="e.g., Chen" />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                        <input id="email" type="email" value={formData.email} readOnly={!!currentUser?.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white border border-gray-700 ${currentUser?.email ? 'opacity-70 cursor-not-allowed' : 'focus:border-purple-500 focus:ring-purple-500 focus:outline-none'}`} required placeholder="your.email@example.com" />
                                        {currentUser?.email && <p className="text-xs text-gray-500 mt-1">Email pre-filled from Google.</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-300 mb-1">Experience Level</label>
                                        <select id="experienceLevel" value={formData.experienceLevel} onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })} className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white border border-gray-700 focus:border-purple-500 focus:ring-purple-500 focus:outline-none appearance-none" required>
                                            <option value="" disabled>Select your experience level</option>
                                            <option value="student">Student / Aspiring</option>
                                            <option value="beginner">Beginner (0-2 years)</option>
                                            <option value="intermediate">Intermediate (2-5 years)</option>
                                            <option value="advanced">Advanced (5+ years)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Areas of Interest (Select all that apply)</label>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            {['UI Design', 'UX Design', 'Product Design', 'Graphic Design', 'Web Design', 'Illustration', 'Prototyping', 'Design Systems'].map((interest) => (
                                                <label key={interest} className="flex items-center space-x-2 cursor-pointer group">
                                                    <input type="checkbox" checked={formData.interests.includes(interest)} onChange={(e) => {
                                                        const newInterests = e.target.checked ? [...formData.interests, interest] : formData.interests.filter(i => i !== interest);
                                                        setFormData({ ...formData, interests: newInterests });
                                                    }} className="form-checkbox h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-0" />
                                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{interest}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="expectations" className="block text-sm font-medium text-gray-300 mb-1">What are you hoping to gain? (Optional)</label>
                                        <textarea id="expectations" value={formData.expectations} onChange={(e) => setFormData({ ...formData, expectations: e.target.value })} className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white h-24 border border-gray-700 focus:border-purple-500 focus:ring-purple-500 focus:outline-none resize-none" placeholder="e.g., Portfolio feedback, career advice, specific skill improvement..." />
                                    </div>
                                    <button type="submit" disabled={submissionStatus === 'submitting'} className={`w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 ${submissionStatus === 'submitting' ? 'opacity-50 cursor-wait' : ''}`}>
                                        {submissionStatus === 'submitting' ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Join Waitlist</span>
                                                <ChevronRight className="h-5 w-5" />
                                            </>
                                        )}
                                    </button>
                                    {submissionStatus === 'error' && (
                                        <p className="text-red-500 text-sm text-center mt-2">Failed to submit. Please check your details and try again.</p>
                                    )}
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Feature Card Component ---
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, amount: 0.3 }} 
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="bg-[#1A1A1A] p-6 rounded-xl border border-gray-800 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
            <div className="mb-4 inline-block p-3 bg-gray-800 rounded-lg">{icon}</div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </motion.div>
    );
}
export default App;