import { Youtube, X, FileText } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Youtube className="text-red-500" />
                        แนะนำการใช้งาน (Video Tutorial)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0 bg-black flex justify-center items-center relative aspect-video">
                    {/* 
                      🔥 วิธีการเปลี่ยนวิดีโอ (How to change video):
                      1. ถ้าใช้ YouTube: ใส่ลิงก์ Embed (เช่น "https://www.youtube.com/embed/ID")
                      2. ถ้าใช้ไฟล์วิดีโอในเครื่อง:
                         - นำไฟล์ไปวางในโฟลเดอร์ "public" (เช่น public/tutorial.mp4)
                         - เปลี่ยนลิงก์ข้างล่างเป็น "/tutorial.mp4"
                    */}
                    {(() => {
                        const videoSrc = "/tutorial.mp4"; // 👈 แก้ไขลิงก์ตรงนี้ (Edit here)
                        const isYouTube = videoSrc.includes('youtube') || videoSrc.includes('youtu.be');
                        const isCanva = videoSrc.includes('canva.com'); // 🔥 Support Canva

                        if (isYouTube || isCanva) {
                            return (
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={videoSrc} // Canva / YouTube URL
                                    title="Tutorial"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="absolute inset-0 w-full h-full border-0"
                                />
                            );
                        } else {
                            return (
                                <video
                                    controls
                                    className="absolute inset-0 w-full h-full"
                                    controlsList="nodownload"
                                >
                                    <source src={videoSrc} type="video/mp4" />
                                    ขออภัย Browser ของคุณไม่รองรับการเล่นวิดีโอ
                                </video>
                            );
                        }
                    })()}
                </div>

                {/* Footer / Manual Link */}
                <div className="bg-white px-6 py-6 border-t border-slate-100 shrink-0">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h4 className="font-bold text-slate-800">เอกสารคู่มือ (User Manual)</h4>
                            <p className="text-sm text-slate-500">เปิดดูเอกสารคู่มือการใช้งานฉบับเต็ม</p>
                        </div>
                        <a
                            href="https://www.canva.com/design/DAGc_jNIaNA/GlcfD3e8pwDMEaApL5UwQQ/view?utm_content=DAGc_jNIaNA&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h450c8a0e57"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors w-full sm:w-auto justify-center"
                        >
                            <FileText className="w-5 h-5 text-indigo-600" />
                            เปิดคู่มือ
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
