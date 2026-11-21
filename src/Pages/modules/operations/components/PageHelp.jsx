// src/Pages/modules/operations/components/PageHelp.jsx
// "What to do on this page" — shown ONLY on pages where the user has an action, in the empty header space next to the bell.
import { useLocation } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

// [English, বাংলা, 中文]
const HINTS = {
  'new-export': ['Fill pickup, receiver and parcel details once. Rate and every document are filled automatically.', 'পিকআপ, প্রাপক ও পার্সেলের তথ্য একবার দিন। রেট ও সব ডকুমেন্ট নিজে থেকে পূর্ণ হবে।', '只需填写一次取件、收货人和包裹信息，运价和所有单据将自动生成。'],
  'new-import': ['Choose the origin country, enter supplier and parcel details, then Submit. The Supervisor checks it next.', 'অরিজিন দেশ বেছে সরবরাহকারী ও পার্সেলের তথ্য দিয়ে জমা দিন। এরপর সুপারভাইজার যাচাই করবেন।', '选择起运国，填写供应商和包裹信息后提交，随后由主管审核。'],
  requests: ['Send a request for a new rate / country or a correction. The KAM answers it here.', 'নতুন রেট / দেশ বা সংশোধনের অনুরোধ পাঠান। KAM এখানেই উত্তর দেবেন।', '在此提交新运价/新国家或更正请求，客户经理会在此回复。'],
  approvals: ['Open a request, read the checklist, then Approve or Return with a reason.', 'অনুরোধ খুলে চেকলিস্ট পড়ুন, তারপর অনুমোদন বা কারণসহ ফেরত দিন।', '打开请求，查看清单后批准或附理由退回。'],
  notifications: ['Items marked as action are on top. Click one to open it and do the next step.', 'যেগুলোতে কাজ করতে হবে সেগুলো উপরে। ক্লিক করে পরের ধাপ করুন।', '需要处理的事项在最上方，点击即可打开并完成下一步。'],
  tasks: ['Your open work, newest first. Open the first one and complete it.', 'আপনার চলমান কাজ, নতুনটি আগে। প্রথমটি খুলে সম্পন্ন করুন।', '待办事项，最新的在前。打开第一项并完成。'],
  new: ['Add shipments (or Add All). Header details fill automatically. A shipment can be in one manifest only.', 'শিপমেন্ট যোগ করুন (বা সব যোগ)। হেডার নিজে পূর্ণ হবে। একটি শিপমেন্ট একটি ম্যানিফেস্টে থাকতে পারে।', '添加货件（或全部添加），表头自动填写。一个货件只能进入一个舱单。'],
  workspace: ['Read the highlighted “What to do next” box and do that step. Use the tabs for documents, tracking and messages.', 'হাইলাইট করা “এরপর কী করবেন” বক্স দেখে সেই ধাপটি করুন। ডকুমেন্ট, ট্র্যাকিং ও বার্তার জন্য ট্যাব ব্যবহার করুন।', '查看高亮的“下一步”提示并完成该步骤；单据、追踪和消息请使用标签页。'],
};

const keyFor = (pathname) => {
  const parts = pathname.replace(/^\/operations\//, '').split('/').filter(Boolean);
  if (parts.length <= 1) return null;
  const last = parts[parts.length - 1];
  if (parts[1] === 'shipments' && parts.length === 3) return 'workspace';
  if (parts[1] === 'tasks' && parts.length === 3) return 'workspace';
  return HINTS[last] ? last : null;
};

const PageHint = ({ compact = false }) => {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const k = keyFor(pathname);
  const row = k && HINTS[k];
  if (!row) return null;
  const text = lang === 'bn' ? row[1] : lang === 'zh' ? row[2] : row[0];
  return (
    <div key={k} className={`animate-[hintIn_.4s_ease-out] flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 ${compact ? 'px-3 py-2 text-[11px]' : 'px-3 py-1.5 text-xs'} font-semibold leading-snug`}>
      <Lightbulb size={15} className="shrink-0 mt-0.5 text-amber-500 animate-pulse" />
      <span className={compact ? '' : 'line-clamp-2'}>{text}</span>
    </div>
  );
};

export default PageHint;
