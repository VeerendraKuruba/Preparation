import React, { useState } from 'react';

const FileNode = ({ node, className, expandedTitle, onToggle }) => {
  if (!node || !Array.isArray(node)) return null;

  return (
    <div className={className}>
      {node.map((item) => {
        const titleLower = item.title.toLowerCase();
        const hasSubItems =
          item.subItems && Array.isArray(item.subItems) && item.subItems.length > 0;
        const isExpanded = expandedTitle === item.title;

        return (
          <div key={item.title} data-test-id={`first-level-${titleLower}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div>{item.title}</div>
              {hasSubItems && (
                <button
                  type="button"
                  data-test-id={`button-${titleLower}`}
                  onClick={() => onToggle(item.title)}
                >
                  {isExpanded ? 'Hide' : 'Expand'}
                </button>
              )}
            </div>
            {hasSubItems && isExpanded && (
              <>
                {console.log(`ul-${titleLower} subitems:`, item.subItems)}
                <ul data-test-id={`ul-${titleLower}`}>
                  {item.subItems.map((sub, index) => {
                    const subLower = String(sub ?? '').toLowerCase();
                    return (
                      <li
                        key={`${titleLower}-${subLower}-${index}`}
                        data-test-id={`li-${titleLower}-${subLower}`}
                      >
                        <div>{sub}</div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

function Solution({ menuConfig }) {
  const [expandedTitle, setExpandedTitle] = useState(null);

  const handleToggle = (title) => {
    setExpandedTitle((prev) => (prev === title ? null : title));
  };

  return (
    <div className="menu-wrapper">
      <FileNode
        className="tree"
        node={menuConfig}
        expandedTitle={expandedTitle}
        onToggle={handleToggle}
      />
    </div>
  );
}

export default Solution;
