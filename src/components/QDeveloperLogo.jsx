import React from 'react';

const QDeveloperLogo = ({className = 'w-5 h-5'}) => {
  return (
    <div className={`${className} bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xs`}>
      Q
    </div>
  );
};

export default QDeveloperLogo;