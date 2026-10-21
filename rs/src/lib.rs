//! RangerDiff: deltas and git-like versions for documents, as strict Rust
//! (Ranger PLAN_RUST_SYNTAX.md, stage R8). The same library as the `.rgr`
//! sources in ../src.
pub mod bytes;
pub mod delta;
pub mod inflate;
pub mod pack;
pub mod png;
pub mod repo;
pub mod sha256;
pub mod smart;
pub mod text;
pub mod u32p;
pub mod xlsx;
pub mod zip;
