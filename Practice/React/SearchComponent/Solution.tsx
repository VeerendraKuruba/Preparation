import React, { ComponentPropsWithoutRef, forwardRef, useState } from 'react';

interface Props extends ComponentPropsWithoutRef<'input'> {
  search: (value: string) => Promise<unknown>;
}

const Solution = forwardRef<HTMLInputElement, Props>((props, ref) => {
  const { search, disabled, value: _value, onChange: _onChange, ...inputProps } = props;
  const [query, setQuery] = useState('');

  const handleRunSearch = () => {
    void search(query);
  };

  const handleClear = () => {
    setQuery('');
    if (_onChange) {
      _onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <>
      <input
        {...inputProps}
        ref={ref}
        type="search"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />
      <button type="button" onClick={handleRunSearch} disabled={disabled}>
        Run search
      </button>
      <button type="button" onClick={handleClear} disabled={disabled}>
        Clear
      </button>
    </>
  );
});

Solution.displayName = 'Solution';

export default Solution;
