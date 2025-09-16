import React from 'react';
import PropTypes from 'prop-types';

/**
 * 孤岛组件 - 这个组件没有被其他组件使用
 * 用于测试孤岛组件检测功能
 */
const OrphanComponent = ({ 
  message = '这是一个孤岛组件',
  type = 'info',
  onClose,
  unusedProp1, // 未使用的属性1
  unusedProp2, // 未使用的属性2
  unusedProp3  // 未使用的属性3
}) => {
  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return 'orphan--success';
      case 'warning':
        return 'orphan--warning';
      case 'error':
        return 'orphan--error';
      default:
        return 'orphan--info';
    }
  };

  return (
    <div className={`orphan-component ${getTypeClass()}`}>
      <div className="orphan-component__content">
        <p>{message}</p>
        {onClose && (
          <button 
            className="orphan-component__close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

OrphanComponent.propTypes = {
  message: PropTypes.string,
  type: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  onClose: PropTypes.func,
  unusedProp1: PropTypes.string,
  unusedProp2: PropTypes.number,
  unusedProp3: PropTypes.bool
};

export default OrphanComponent;