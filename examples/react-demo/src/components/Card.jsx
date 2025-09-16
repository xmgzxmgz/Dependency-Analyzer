import React from 'react';
import PropTypes from 'prop-types';
import Button from './Button';
import './Card.css';

/**
 * 卡片组件
 * @param {Object} props - 组件属性
 * @param {string} props.title - 卡片标题
 * @param {string} props.content - 卡片内容
 * @param {string} props.imageUrl - 图片URL
 * @param {Array} props.actions - 操作按钮配置
 * @param {string} props.className - 自定义CSS类名
 */
const Card = ({ 
  title, 
  content, 
  imageUrl, 
  actions = [], 
  className = '' 
}) => {
  return (
    <div className={`card ${className}`}>
      {imageUrl && (
        <div className="card__image">
          <img src={imageUrl} alt={title} />
        </div>
      )}
      
      <div className="card__content">
        {title && <h3 className="card__title">{title}</h3>}
        {content && <p className="card__text">{content}</p>}
      </div>
      
      {actions.length > 0 && (
        <div className="card__actions">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'secondary'}
              size="small"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

Card.propTypes = {
  title: PropTypes.string,
  content: PropTypes.string,
  imageUrl: PropTypes.string,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      variant: PropTypes.string
    })
  ),
  className: PropTypes.string
};

export default Card;