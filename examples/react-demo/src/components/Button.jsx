import React from 'react';
import PropTypes from 'prop-types';
import './Button.css';

/**
 * 通用按钮组件
 * @param {Object} props - 组件属性
 * @param {string} props.children - 按钮文本
 * @param {string} props.variant - 按钮样式变体
 * @param {string} props.size - 按钮大小
 * @param {boolean} props.disabled - 是否禁用
 * @param {Function} props.onClick - 点击事件处理函数
 * @param {string} props.className - 自定义CSS类名
 * @param {string} props.unusedProp - 未使用的属性（用于测试）
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  onClick,
  className = '',
  unusedProp // 这个prop没有被使用，用于测试冗余检测
}) => {
  const baseClass = 'btn';
  const variantClass = `btn--${variant}`;
  const sizeClass = `btn--${size}`;
  const disabledClass = disabled ? 'btn--disabled' : '';
  
  const buttonClass = [
    baseClass,
    variantClass,
    sizeClass,
    disabledClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClass}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
  unusedProp: PropTypes.string
};

export default Button;