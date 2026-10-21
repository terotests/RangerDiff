// The strict-Rust RangerDiff against its own tests and the .rgr formats.
mod delta_tests;
mod digest;
mod harness;
mod pack_tests;
mod png_tests;
mod repo_tests;
mod sha_tests;
mod text_tests;

fn main() {
    let mut t = harness::Test::new();
    delta_tests::run(&mut t);
    sha_tests::run(&mut t);
    text_tests::run(&mut t);
    pack_tests::run(&mut t);
    png_tests::run(&mut t);
    repo_tests::run(&mut t);
    t.done();
    digest::run();
}
