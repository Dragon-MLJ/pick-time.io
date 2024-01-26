import { useState } from 'react';
import { useRouter } from 'next/router';

const LanguageSelector = () => {
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = useState(router.locale);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setSelectedLocale(selectedValue);
    router.push(router.pathname, router.asPath, { locale: selectedValue });
  };

  return (
    <div className="flex flex-col items-center">
      <p className="opacity-30 mb-2 text-lg font-bold">Languages</p>
      <select
        value={selectedLocale}
        onChange={handleChange}
        className="p-2 border border-gray-300 rounded focus:outline-none focus:border-indigo-500"
        style={{ maxWidth: '36rem' }}
      >
        <option value="en-US">English</option>
        <option value="zh-TW">繁體中文</option>
        <option value="zh-CN">简体中文</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
