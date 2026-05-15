# Use A Nearley Parser

UIKitML uses a Nearley grammar instead of upstream pmndrs/uikitml's parse5-based parsing. The grammar gives this package exact control over case-sensitive component names, strict unknown-component errors, performance characteristics, and UIKitML-specific syntax such as self-closing syntax for all components without inheriting browser HTML normalization.
