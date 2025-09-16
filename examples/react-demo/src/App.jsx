import React, { useState } from "react";
import Button from "./components/Button";
import Card from "./components/Card";
import "./App.css";

/**
 * 主应用组件
 * 演示组件间的依赖关系
 */
function App() {
  const [count, setCount] = useState(0);
  const [cards, setCards] = useState([
    {
      id: 1,
      title: "示例卡片 1",
      content: "这是第一个示例卡片的内容。",
      imageUrl: "https://via.placeholder.com/300x200",
    },
    {
      id: 2,
      title: "示例卡片 2",
      content: "这是第二个示例卡片的内容。",
      imageUrl: "https://via.placeholder.com/300x200",
    },
  ]);

  const handleIncrement = () => {
    setCount((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setCount((prev) => prev - 1);
  };

  const handleReset = () => {
    setCount(0);
  };

  const handleCardAction = (cardId, actionType) => {
    console.log(`Card ${cardId} action: ${actionType}`);

    if (actionType === "delete") {
      setCards((prev) => prev.filter((card) => card.id !== cardId));
    }
  };

  const cardActions = [
    {
      label: "查看",
      onClick: (cardId) => handleCardAction(cardId, "view"),
      variant: "primary",
    },
    {
      label: "编辑",
      onClick: (cardId) => handleCardAction(cardId, "edit"),
      variant: "secondary",
    },
    {
      label: "删除",
      onClick: (cardId) => handleCardAction(cardId, "delete"),
      variant: "danger",
    },
  ];

  return (
    <div className="app">
      <header className="app__header">
        <h1>前端依赖分析工具演示</h1>
        <p>这是一个React示例项目，用于测试依赖关系分析功能。</p>
      </header>

      <main className="app__main">
        <section className="counter-section">
          <h2>计数器示例</h2>
          <div className="counter">
            <span className="counter__value">当前计数: {count}</span>
            <div className="counter__controls">
              <Button
                variant="secondary"
                size="small"
                onClick={handleDecrement}
              >
                -1
              </Button>
              <Button variant="primary" size="small" onClick={handleIncrement}>
                +1
              </Button>
              <Button variant="danger" size="small" onClick={handleReset}>
                重置
              </Button>
            </div>
          </div>
        </section>

        <section className="cards-section">
          <h2>卡片列表</h2>
          <div className="cards-grid">
            {cards.map((card) => (
              <Card
                key={card.id}
                title={card.title}
                content={card.content}
                imageUrl={card.imageUrl}
                actions={cardActions.map((action) => ({
                  ...action,
                  onClick: () => action.onClick(card.id),
                }))}
              />
            ))}
          </div>

          {cards.length === 0 && (
            <div className="empty-state">
              <p>所有卡片都已删除</p>
              <Button
                variant="primary"
                onClick={() =>
                  setCards([
                    {
                      id: Date.now(),
                      title: "新卡片",
                      content: "这是一个新创建的卡片。",
                      imageUrl: "https://via.placeholder.com/300x200",
                    },
                  ])
                }
              >
                添加新卡片
              </Button>
            </div>
          )}
        </section>
      </main>

      <footer className="app__footer">
        <p>© 2024 前端依赖分析工具演示项目</p>
      </footer>
    </div>
  );
}

export default App;
