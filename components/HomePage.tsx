import React from 'react';
import { MagicWandIcon, SparklesIcon, SettingsIcon, ImageIcon, CheckCircleIcon } from './IconComponents';

interface HomePageProps {
  onStart: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }> = ({ icon, title, children, className }) => (
    <div className={`bg-slate-800/40 border border-slate-700 p-8 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:border-sky-500/50 hover:bg-slate-800/60 hover:shadow-2xl hover:shadow-sky-500/20 ${className}`}>
        <div className="inline-block p-3 bg-sky-500/10 rounded-full mb-4 border border-sky-500/20 text-sky-400 animate-pulse">
            {icon}
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
        <p className="text-slate-400">{children}</p>
    </div>
);


const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  return (
    <div className="text-slate-200 overflow-x-hidden">
        {/* Hero Section */}
        <header className="min-h-screen flex flex-col items-center justify-center text-center p-4 relative">
            <div className="inline-block p-4 bg-sky-500/10 rounded-full mb-6 border border-sky-500/20 animate-pulse">
                <MagicWandIcon className="w-12 h-12 text-sky-400" />
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-500 mb-4">
                مولد الصور نانو بنانا
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                أطلق العنان لإبداعك. قم بتوليد صور فريدة من نوعها وتعديلها بسهولة فائقة باستخدام قوة نموذج Gemini "Nano Banana" المتطور.
            </p>
            <div className="absolute bottom-10 animate-bounce">
                <svg className="w-8 h-8 text-slate-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                </svg>
            </div>
        </header>

        {/* Features Section */}
        <main className="py-20 px-4 space-y-24">
            <div className="max-w-6xl mx-auto">
                {/* Feature 1: Generation */}
                <div className="grid md:grid-cols-2 gap-12 items-center scroll-animate">
                    <div>
                        <FeatureCard 
                            icon={<ImageIcon className="w-8 h-8" />} 
                            title="حوّل الكلمات إلى روائع"
                        >
                           ببساطة اكتب وصفاً لما تتخيله، وسيقوم الذكاء الاصطناعي بتحويل كلماتك إلى صورة فنية فريدة. من المناظر الطبيعية الخلابة إلى الشخصيات الخيالية، لا حدود لإبداعك.
                           <ul className="mt-4 space-y-2">
                               <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-sky-400" /> <span className="text-slate-300">نتائج فورية وعالية الجودة</span></li>
                               <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-sky-400" /> <span className="text-slate-300">فهم دقيق للأوصاف المعقدة</span></li>
                           </ul>
                        </FeatureCard>
                    </div>
                    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                        <div className="bg-slate-900 p-3 rounded-t-lg text-sm text-slate-400">
                            <p className="font-mono">> رائد فضاء يركب حصاناً على المريخ...</p>
                        </div>
                        <div className="aspect-square bg-cover bg-center rounded-b-lg" style={{backgroundImage: "url('https://storage.googleapis.com/static.aistudio.google.com/public/stories/gemini/prompting-techniques/astronaut-horse.jpeg')"}}></div>
                    </div>
                </div>

                {/* Feature 2: Editing */}
                <div className="grid md:grid-cols-2 gap-12 items-center mt-24 scroll-animate">
                    <div className="md:order-2">
                        <FeatureCard 
                            icon={<SparklesIcon className="w-8 h-8" />}
                            title="تعديل سحري مع نانو بنانا"
                        >
                            هل لديك صورة وتريد تحسينها أو تغييرها؟ قم بتحميلها واكتب تعليماتك. أضف عناصر، أو غيّر الألوان، أو أزل أشياء غير مرغوب فيها بفضل قوة Nano Banana.
                             <ul className="mt-4 space-y-2">
                               <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-sky-400" /> <span className="text-slate-300">تعديلات دقيقة أو تغييرات جذرية</span></li>
                               <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-sky-400" /> <span className="text-slate-300">الحفاظ على جودة الصورة الأصلية</span></li>
                           </ul>
                        </FeatureCard>
                    </div>
                    <div className="relative md:order-1 h-80 rounded-xl overflow-hidden border border-slate-700">
                        <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://storage.googleapis.com/static.aistudio.google.com/public/stories/gemini/prompting-techniques/dog-on-a-rock.jpeg')"}}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent flex items-end justify-center p-4 text-center">
                            <p className="text-white font-bold bg-black/50 p-2 rounded">قبل: كلب على صخرة</p>
                        </div>
                        <div className="absolute top-0 right-0 p-4 text-white bg-black/50 rounded-bl-xl font-bold text-sm">
                          بعد: اجعلها قطة ترتدي قبعة
                        </div>
                    </div>
                </div>

                {/* Feature 3: Advanced Settings */}
                <div className="grid md:grid-cols-2 gap-12 items-center mt-24 scroll-animate">
                    <div>
                        <FeatureCard 
                            icon={<SettingsIcon className="w-8 h-8" />}
                            title="تحكم كامل وإعدادات متقدمة"
                        >
                            أنت المخرج الفني. تحكم في أسلوب الصورة، جودتها، وأبعادها. استخدم "وضع برو" وقوة التعديل للحصول على نتائج دقيقة ومخصصة تماماً كما تريد.
                             <ul className="mt-4 space-y-2">
                               <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-sky-400" /> <span className="text-slate-300">اختر بين أساليب فنية متعددة</span></li>
                               <li className="flex items-center gap-3"><CheckCircleIcon className="w-5 h-5 text-sky-400" /> <span className="text-slate-300">تحكم دقيق في قوة التعديل</span></li>
                           </ul>
                        </FeatureCard>
                    </div>
                    <div className="h-80 grid grid-cols-2 grid-rows-2 gap-4">
                        <div className="col-span-2 row-span-1 bg-slate-800/40 border border-slate-700 rounded-xl flex items-center justify-center p-4 text-center text-sky-300 font-bold">
                            جودة عالية (HD)
                        </div>
                         <div className="col-span-1 row-span-1 bg-slate-800/40 border border-slate-700 rounded-xl flex items-center justify-center p-4 text-center text-slate-400">
                            أسلوب واقعي
                        </div>
                         <div className="col-span-1 row-span-1 bg-slate-800/40 border border-slate-700 rounded-xl flex items-center justify-center p-4 text-center text-slate-400">
                            أبعاد 16:9
                        </div>
                    </div>
                </div>
            </div>
        </main>
        
        {/* CTA Section */}
        <section className="text-center py-20 px-4 bg-slate-900/50 mt-12 scroll-animate">
             <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">هل أنت مستعد للإبداع؟</h2>
             <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">انضم إلينا الآن وابدأ في تحويل خيالك إلى روائع بصرية ملموسة.</p>
             <button
                onClick={onStart}
                className="bg-sky-500 text-white font-bold py-4 px-10 rounded-full hover:bg-sky-600 transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-sky-500/30"
                >
                ابدأ التجربة الآن
            </button>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-slate-800">
             <p className="text-slate-400">&copy; {new Date().getFullYear()} مولد الصور نانو بنانا. جميع الحقوق محفوظة.</p>
             <p className="text-slate-500 mt-2">تصميم وتطوير: راكان</p>
        </footer>
    </div>
  );
};

export default HomePage;